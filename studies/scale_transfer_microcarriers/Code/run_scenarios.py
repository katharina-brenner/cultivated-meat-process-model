"""Regenerate deterministic scenario CSVs and JSON summary with standard Python."""
import csv
import json
import math
from decimal import Decimal
from pathlib import Path
from model import Parameters, evaluate

OUT = Path(__file__).resolve().parent.parent/'Source_Data'


def write_csv(path, rows):
    with path.open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def maturation_crossover(p, power, ratio, domain=(10.,80.), **base):
    """Carrier loading where recovered upstream capacity meets maturation.

    Return None if maturation never binds within the stated loading domain.
    This threshold concerns potential stage capacity, prior to suspension flags.
    """
    def difference(a):
        r = evaluate(p,a,pmax_W_m3=power,maturation_ratio=ratio, **base)
        return r['Fafterharvest_cells_year']-r['FM_cells_year']
    lo,hi = domain
    if difference(lo)>=0:
        return {'surface_cm2_ml':lo,'status':'already_binding_at_domain_start'}
    if difference(hi)<0:
        return {'surface_cm2_ml':None,'status':f'not_reached_within_{lo:g}_to_{hi:g}'}
    for _ in range(80):
        mid = (lo+hi)/2
        if difference(mid)>=0:
            hi=mid
        else:
            lo=mid
    return {'surface_cm2_ml':(lo+hi)/2,'status':'crossing_in_domain'}


def inclusive_sweep(spec):
    """Inclusive decimal grid; reject malformed or non-integral endpoint grids."""
    if not isinstance(spec, list) or len(spec) != 3 or any(isinstance(x,bool) for x in spec):
        raise ValueError('Sweep requires [start, stop, step]')
    try:
        start, stop, step = map(lambda x: Decimal(str(x)), spec)
        if not all(x.is_finite() for x in (start,stop,step)) or step <= 0 or stop < start:
            raise ValueError('Sweep must be finite, increasing and have positive step')
        intervals=(stop-start)/step
        if intervals != intervals.to_integral_value():
            raise ValueError('Sweep stop must lie on its decimal grid')
        cast=int if all(type(x) is int for x in spec) else float
        return [cast(start+i*step) for i in range(int(intervals)+1)]
    except (ArithmeticError, TypeError) as exc:
        raise ValueError('Invalid sweep') from exc


def generate(register, out):
    """Generate tables using the complete declared scenario register."""
    out=Path(out);out.mkdir(parents=True,exist_ok=True)
    p=Parameters(**{key:entry['value'] for key,entry in register['parameters'].items()})
    inputs={key:entry['value'] for key,entry in register['scenario_inputs'].items()}
    surfaces=inclusive_sweep(inputs['surface_cm2_ml'])
    powers=inputs['pmax_W_m3']; ratios=inputs['maturation_volume_ratio']; demands=inputs['qO2_multiplier']
    count,volume=inputs['loading_base_vessel_count_and_volume_L']
    base_args=dict(vessel_volume_L=volume,vessel_count=count)
    base_surface=inputs['base_surface_cm2_ml'];base_power=inputs['base_pmax_W_m3'];base_ratio=inputs['base_maturation_volume_ratio']
    def scenario(a, power=base_power, ratio=base_ratio, q=1):
        return evaluate(p,a,**base_args,pmax_W_m3=power,maturation_ratio=ratio,qO2_multiplier=q)
    loading=[scenario(a,power) for power in powers for a in surfaces]
    architecture=[]
    for n,v in inputs['architecture_vessel_count_and_volume_L']:
        label={(20000,5):'development',(200,500):'parallel_500L',(10,10000):'parallel_10000L',(4,25000):'large_25000L'}.get((n,v),f"array_{n}x{v:g}L")
        architecture.append({'architecture':label,**evaluate(p,base_surface,v,n,pmax_W_m3=base_power,maturation_ratio=base_ratio)})
    maturation=[scenario(base_surface,ratio=r) for r in inclusive_sweep(inputs['maturation_ratio_sweep'])]
    interventions=[scenario(a,power,ratio) for a in inputs['intervention_surface_cm2_ml'] for power in powers for ratio in ratios]
    demand=[scenario(a,power,q=q) for q in demands for power in powers for a in surfaces]
    downstream=[scenario(a,ratio=ratio) for ratio in ratios for a in surfaces]
    reference=scenario(base_surface)
    qcritical=reference['Xoxygen_cells_m3']/reference['Xsurface_cells_m3']
    allocation_q=inclusive_sweep(inputs['allocation_qO2_sweep'])
    for q in (1.,qcritical):
        if allocation_q[0] <= q <= allocation_q[-1] and not any(math.isclose(q,x,rel_tol=1e-13,abs_tol=1e-13) for x in allocation_q):
            allocation_q.append(q)
    boundary=[]
    for q in sorted(allocation_q):
        row=scenario(base_surface,ratio=1,q=q)
        row['required_maturation_volume_ratio']=row['Fafterharvest_cells_year']/row['FM_cells_year'] if row['Fafterharvest_cells_year'] is not None else None
        row['upstream_constraint']='oxygen' if row['Xoxygen_cells_m3']<row['Xsurface_cells_m3'] else 'surface'
        boundary.append(row)
    series={'loading.csv':loading,'architecture.csv':architecture,'maturation.csv':maturation,
            'interventions.csv':interventions,'oxygen_demand.csv':demand,'allocation_boundary.csv':boundary,'downstream_loading.csv':downstream}
    for filename,rows in series.items():
        write_csv(out/filename,rows)
    base=reference
    required_ratio=base['Fafterharvest_cells_year']/base['FM_cells_year']*base_ratio
    summary={
        'scope':'Original deterministic conditional engineering model; no biological damage prediction or validated industrial production forecast.',
        'output_basis':'accepted viable input-cell equivalents per year; not kg or tonnes of meat',
        'parameter_file':'../Code/parameters.json',
        'correlation_scope':'CHO-media oxygen-transfer prior; reference-calibrated empirical solids-suspension prior; assumed anchor and qualification power bounds.',
        'schemas':{name:list(rows[0]) for name,rows in series.items()},
        'row_counts':{name:len(rows) for name,rows in series.items()},
        'oxygen_thresholds':[{'pmax_W_m3':power,'AO_cm2_ml':scenario(base_surface,power)['AO_cm2_ml'],
                                'kLa_s_1':scenario(base_surface,power)['kLa_s_1']} for power in powers],
        'maturation_thresholds':[{'pmax_W_m3':power,'maturation_ratio':ratio,**maturation_crossover(p,power,ratio,domain=(surfaces[0],surfaces[-1]),**base_args)} for power in powers for ratio in ratios],
        'maturation_volume_ratio_required_at_base':required_ratio,
        'base_configuration':{'surface_cm2_ml':base_surface,'pmax_W_m3':base_power,'maturation_volume_ratio':base_ratio,**base_args},
        **({'maturation_volume_ratio_required_at_A40_pmax5':required_ratio} if base_surface==40 and base_power==5 else {}),
        'architecture_results':architecture,
        'allocation_qcritical':qcritical,
        'allocation_boundary_row_count':len(boundary),
        'conditional_findings':[
            'Added carrier surface ceases to increase oxygen-supported endpoint cell inventory above AO; AO is a scenario threshold, not a measured CM limit.',
            'With common power density and superficial gas velocity, feasible equal-working-volume STR arrays have equal bulk oxygen capacities and aggregate stage output; no unsupported scale penalty is imposed.',
            'Increasing oxygen duty cannot release a binding maturation plateau. Added maturation capacity cannot repair a failed suspension screen.',
            'Suspension-infeasible annual outputs are null rather than biological zero. Reynolds screening flags further constrain interpretation.',
            'Biological retained function, medium/metabolite constraints, seed supply, contamination and batch scheduling remain outside scope.'
        ]}
    (out/'model_summary.json').write_text(json.dumps(summary,indent=2,allow_nan=False)+'\n')
    return summary


def main():
    register=json.loads((Path(__file__).resolve().parent/'parameters.json').read_text())
    summary=generate(register,OUT)
    print(json.dumps({'row_counts':summary['row_counts'],
                      'oxygen_thresholds':summary['oxygen_thresholds'],
                      'required_maturation_ratio':summary['maturation_volume_ratio_required_at_base'],
                      'allocation_qcritical':summary['allocation_qcritical']},indent=2))

if __name__=='__main__':
    main()
