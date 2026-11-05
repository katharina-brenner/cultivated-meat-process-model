"""Independent audit: no imports from model.py or scenario runner."""
import csv,json,math
from pathlib import Path
B=Path(__file__).resolve().parents[1]
p={k:v['value'] for k,v in json.loads((B/'Code/parameters.json').read_text())['parameters'].items()}
def calc(r):
 a=float(r['surface_cm2_ml']);v=float(r['vessel_volume_L'])/1000;n=int(r['vessel_count']);power=float(r['pmax_W_m3']);ratio=float(r['maturation_volume_ratio']);q=float(r['qO2_multiplier'])
 T=(v*4/math.pi/p['height_diameter_ratio'])**(1/3);D=T*p['impeller_tank_ratio'];area=math.pi*T*T/4
 D0=(p['reference_volume_m3']*4/math.pi/p['height_diameter_ratio'])**(1/3)*p['impeller_tank_ratio']
 # Solve dimensional power balance, independently of implementation.
 coefficient=p['gassed_power_ratio']*p['impeller_count']*p['power_number']*p['density_kg_m3']*D**5/v
 speed=(power/coefficient)**(1/3)
 if p['qualified_speed_s_1'] is not None:speed=min(speed,p['qualified_speed_s_1'])
 actual=coefficient*speed**3;js=p['reference_Njs_s_1']*(a*100/p['reference_surface_m2_m3'])**p['suspension_loading_exponent']*(D/D0)**p['suspension_diameter_exponent']
 kla=p['oxygen_transfer_multiplier']*p['oxygen_transfer_coefficient']*actual**p['oxygen_power_exponent']*p['gas_superficial_velocity_m_s']**p['oxygen_gas_exponent']
 xs=a*100*p['surface_density_cells_m2'];xo=kla*(p['oxygen_saturation_mol_m3']-p['oxygen_minimum_mol_m3'])/(p['oxygen_demand_mol_cell_s']*q);xh=min(xs,xo)
 valid=xh>p['inoculum_cells_m3'];cycle=p['lag_time_s']+p['expansion_turnaround_s']+p['doubling_time_s']*math.log2(xh/p['inoculum_cells_m3']) if valid else None
 fe=n*v*xh*p['operating_time_s_year']/cycle if valid else None;fa=p['harvest_recovery']*fe if valid else None;fm=n*v*ratio*p['maturation_loading_cells_m3']*p['operating_time_s_year']/p['maturation_cycle_s'];fh=p['harvest_capacity_cells_year'];fin=min(fa,fm,fh if fh is not None else math.inf) if valid else None;ok=js<=speed*(1+1e-12);re=speed*D*D/p['kinematic_viscosity_m2_s']
 active='suspension_infeasible' if not ok else 'endpoint_not_above_inoculum' if not valid else 'harvest_service' if fh is not None and fh<=min(fa,fm) else 'maturation' if fm<=fa else 'oxygen' if xo<xs else 'surface'
 return dict(surface_cm2_ml=a,surface_m2_m3=a*100,vessel_volume_L=v*1000,vessel_count=n,total_expansion_volume_m3=n*v,pmax_W_m3=power,maturation_volume_ratio=ratio,qO2_multiplier=q,Xsurface_cells_m3=xs,Xoxygen_cells_m3=xo,Xharvest_cells_m3=xh,expansioncycle_d=cycle/86400 if valid else None,FE_cells_year=fe,Fafterharvest_cells_year=fa,FM_cells_year=fm,FH_cells_year=fh,Fin_cells_year=fin if ok and valid else None,potential_Fin_cells_year=fin,accepted_input_cells_year=fin*p['accepted_fraction'] if ok and valid else None,Njs_rpm=60*js,Nupper_rpm=60*speed,minPV_W_m3=coefficient*js**3,operatingPV_W_m3=actual,AO_cm2_ml=xo/p['surface_density_cells_m2']/100,gasflow_L_min=area*p['gas_superficial_velocity_m_s']*60000,kLa_s_1=kla,Reynolds_number=re,turbulent_screen_pass=re>=p['turbulent_screen_Re'],feasible=ok,expansion_valid=valid,activeconstraint=active,upper_bound_status='assumed_power_envelope' if p['qualified_speed_s_1'] is None else 'externally_supplied_speed_bound',tank_diameter_m=T,liquid_height_m=T*p['height_diameter_ratio'],impeller_diameter_m=D,tank_area_m2=area)
rows=0;checks=0;worst=0;counts={};fail=[]
for file in sorted((B/'Source_Data').glob('*.csv')):
 data=list(csv.DictReader(file.open()));counts[file.name]=len(data)
 for i,r in enumerate(data,2):
  rows+=1
  for key,expected in calc(r).items():
   checks+=1;given=r[key]
   if expected is None:match=given==''
   elif isinstance(expected,bool):match=given==str(expected)
   elif isinstance(expected,str):match=given==expected
   else:
    err=abs(float(given)-expected)/max(abs(expected),1e-300);worst=max(worst,err);match=math.isclose(float(given),expected,rel_tol=2e-13,abs_tol=1e-12)
   if not match:fail.append([file.name,i,key,given,expected])
print(json.dumps(dict(rows=rows,field_checks=checks,counts=counts,max_relative_error=worst,failures=fail),indent=2))
base=dict(surface_cm2_ml=40,vessel_volume_L=1000,vessel_count=100,pmax_W_m3=5,maturation_volume_ratio=.3,qO2_multiplier=1)
print('BASE',json.dumps(calc(base)))
for power in (2,5,20):
 for ratio in (.1,.3,1):
  def diff(a):
   c=calc(dict(base,surface_cm2_ml=a,pmax_W_m3=power,maturation_volume_ratio=ratio));return c['Fafterharvest_cells_year']-c['FM_cells_year']
  lo,hi=10.,80.
  if diff(lo)>=0:result='already binding at 10'
  elif diff(hi)<0:result='not reached at 80'
  else:
   for _ in range(100):
    mid=(lo+hi)/2
    if diff(mid)<0:lo=mid
    else:hi=mid
   result=(lo+hi)/2
  print('CROSSOVER',power,ratio,result)
print('ANCHOR_RE',p['reference_Njs_s_1']*(p['impeller_tank_ratio']*(4*p['reference_volume_m3']/math.pi/p['height_diameter_ratio'])**(1/3))**2/p['kinematic_viscosity_m2_s'])
for row in csv.DictReader((B/'Source_Data/allocation_boundary.csv').open()):
 c=calc(row);required=c['Fafterharvest_cells_year']/c['FM_cells_year']
 assert math.isclose(float(row['required_maturation_volume_ratio']),required,rel_tol=2e-13)
 assert row['upstream_constraint']==('oxygen' if c['Xoxygen_cells_m3']<c['Xsurface_cells_m3'] else 'surface')
 assert c['expansion_valid'] and c['feasible']
print('ALLOCATION_EXTRA_FIELDS_VERIFIED',sum(1 for _ in csv.DictReader((B/'Source_Data/allocation_boundary.csv').open())))
assert not fail, fail
print('TOTAL_FIELD_CHECKS',checks+2*sum(1 for _ in csv.DictReader((B/'Source_Data/allocation_boundary.csv').open())))
summary=json.loads((B/'Source_Data/model_summary.json').read_text())
qcritical=(.075*5**.47*.001**.8*.16/1e-16)/(40*100*2e8)
assert math.isclose(summary['allocation_qcritical'],qcritical,rel_tol=2e-13)
assert any(math.isclose(float(r['qO2_multiplier']),qcritical,rel_tol=2e-13) for r in csv.DictReader((B/'Source_Data/allocation_boundary.csv').open()))
print('INDEPENDENT_KNEE',qcritical)
for q in (.3,1,qcritical,3):
 c=calc(dict(base,qO2_multiplier=q,maturation_volume_ratio=1));print('MAP_BOUNDARY',q,c['Fafterharvest_cells_year']/c['FM_cells_year'])
