"""Conditional CM engineering capacity envelope; no biological damage prediction.
All dataclass values use SI, except explicitly named day/hour reference fields.
Annual output is accepted input-cell equivalents, never meat mass.
"""
from dataclasses import dataclass, asdict
import math

@dataclass(frozen=True)
class Parameters:
    height_diameter_ratio: float = 1.5
    impeller_tank_ratio: float = .4
    impeller_count: int = 1
    power_number: float = 1.3
    gassed_power_ratio: float = .8
    density_kg_m3: float = 1000.
    kinematic_viscosity_m2_s: float = .7e-6
    reference_volume_m3: float = .003
    reference_surface_m2_m3: float = 2000.
    reference_Njs_s_1: float = 1.
    surface_density_cells_m2: float = 2e8
    inoculum_cells_m3: float = 1e11
    doubling_time_s: float = 172800.
    lag_time_s: float = 86400.
    expansion_turnaround_s: float = 172800.
    operating_time_s_year: float = 28512000.
    gas_superficial_velocity_m_s: float = .001
    oxygen_transfer_coefficient: float = .075
    oxygen_power_exponent: float = .47
    oxygen_gas_exponent: float = .8
    oxygen_transfer_multiplier: float = 1.
    oxygen_saturation_mol_m3: float = .20
    oxygen_minimum_mol_m3: float = .04
    oxygen_demand_mol_cell_s: float = 1e-16
    harvest_recovery: float = .8
    accepted_fraction: float = .9
    maturation_loading_cells_m3: float = 1e12
    maturation_cycle_s: float = 864000.
    harvest_capacity_cells_year: float | None = None
    qualified_speed_s_1: float | None = None
    turbulent_screen_Re: float = 10000.
    suspension_loading_exponent: float = .13
    suspension_diameter_exponent: float = -.85


def geometry(p, volume_m3):
    """Cylindrical working-liquid geometry (not nominal vessel size)."""
    if not math.isfinite(volume_m3) or volume_m3 <= 0:
        raise ValueError('Working volume must be positive')
    T = (4*volume_m3/(math.pi*p.height_diameter_ratio))**(1/3)
    return {'tank_diameter_m': T, 'liquid_height_m': T*p.height_diameter_ratio,
            'impeller_diameter_m': T*p.impeller_tank_ratio,
            'tank_area_m2': math.pi*T*T/4}


def _validate(p):
    optional = {'harvest_capacity_cells_year', 'qualified_speed_s_1'}
    zero_allowed = {'lag_time_s', 'expansion_turnaround_s',
                    'oxygen_minimum_mol_m3', 'harvest_capacity_cells_year'}
    for name, value in asdict(p).items():
        if name in optional and value is None:
            continue
        if name == 'suspension_diameter_exponent':
            if not math.isfinite(value):
                raise ValueError(f'Invalid {name}')
            continue
        if not math.isfinite(value) or value < 0 or (value == 0 and name not in zero_allowed | {'harvest_recovery','accepted_fraction'}):
            raise ValueError(f'Invalid {name}')
    for name in ('harvest_recovery', 'accepted_fraction', 'gassed_power_ratio'):
        if not 0 <= getattr(p,name) <= 1:
            raise ValueError(f'{name} must be within [0,1]')
    if p.oxygen_saturation_mol_m3 <= p.oxygen_minimum_mol_m3:
        raise ValueError('Oxygen saturation must exceed minimum concentration')
    if not 0 < p.impeller_tank_ratio < 1:
        raise ValueError('Impeller diameter must fit inside tank diameter')
    if type(p.impeller_count) is not int:
        raise ValueError('impeller_count must be an integer')


def evaluate(p: Parameters, surface_cm2_ml: float, vessel_volume_L: float = 1000,
             vessel_count: int = 100, pmax_W_m3: float = 5,
             maturation_ratio: float = .3, qO2_multiplier: float = 1) -> dict:
    """Screen transport and annual stage capacity for specified inputs.

    `feasible` means Njs <= upper agitation bound only. A separate Reynolds flag
    identifies unqualified constant-power-number use. Outputs for infeasible
    suspension remain None, with potential capacities retained for diagnosis.
    """
    _validate(p)
    for name,value in [('surface',surface_cm2_ml),('volume',vessel_volume_L),
                       ('power',pmax_W_m3),('maturation ratio',maturation_ratio),
                       ('oxygen multiplier',qO2_multiplier)]:
        if not math.isfinite(value) or value <= 0:
            raise ValueError(f'{name} must be finite and positive')
    if type(vessel_count) is not int or vessel_count <= 0:
        raise ValueError('vessel_count must be a positive integer')
    V = vessel_volume_L/1000
    A = surface_cm2_ml*100
    g = geometry(p,V)
    g0 = geometry(p,p.reference_volume_m3)
    D = g['impeller_diameter_m']
    factor = p.gassed_power_ratio*p.impeller_count*p.power_number*p.density_kg_m3*D**5/V
    Npower = (pmax_W_m3/factor)**(1/3)
    Nupper = min(Npower,p.qualified_speed_s_1) if p.qualified_speed_s_1 is not None else Npower
    Njs = p.reference_Njs_s_1*(A/p.reference_surface_m2_m3)**p.suspension_loading_exponent*(D/g0['impeller_diameter_m'])**p.suspension_diameter_exponent
    power = factor*Nupper**3
    kla = p.oxygen_transfer_multiplier*p.oxygen_transfer_coefficient*power**p.oxygen_power_exponent*p.gas_superficial_velocity_m_s**p.oxygen_gas_exponent
    XS = p.surface_density_cells_m2*A
    XO = kla*(p.oxygen_saturation_mol_m3-p.oxygen_minimum_mol_m3)/(p.oxygen_demand_mol_cell_s*qO2_multiplier)
    XH = min(XS,XO)
    expansion_valid = XH > p.inoculum_cells_m3
    cycle_s = p.lag_time_s+p.expansion_turnaround_s+math.log(XH/p.inoculum_cells_m3)*p.doubling_time_s/math.log(2) if expansion_valid else None
    FE = vessel_count*V*XH*p.operating_time_s_year/cycle_s if expansion_valid else None
    FA = p.harvest_recovery*FE if FE is not None else None
    FM = maturation_ratio*vessel_count*V*p.maturation_loading_cells_m3*p.operating_time_s_year/p.maturation_cycle_s
    FH = p.harvest_capacity_cells_year
    suspension_ok = Njs <= Nupper*(1+1e-12)
    fin_potential = min(FA,FM,FH if FH is not None else math.inf) if FA is not None else None
    if not suspension_ok:
        active = 'suspension_infeasible'
    elif not expansion_valid:
        active = 'endpoint_not_above_inoculum'
    elif FH is not None and FH <= min(FA,FM):
        active = 'harvest_service'
    elif FM <= FA:
        active = 'maturation'
    else:
        active = 'oxygen' if XO < XS else 'surface'
    valid = suspension_ok and expansion_valid
    Re = Nupper*D*D/p.kinematic_viscosity_m2_s
    return dict(surface_cm2_ml=surface_cm2_ml,surface_m2_m3=A,
        vessel_volume_L=vessel_volume_L,vessel_count=vessel_count,
        total_expansion_volume_m3=V*vessel_count,pmax_W_m3=pmax_W_m3,
        maturation_volume_ratio=maturation_ratio,qO2_multiplier=qO2_multiplier,
        Xsurface_cells_m3=XS,Xoxygen_cells_m3=XO,Xharvest_cells_m3=XH,
        expansioncycle_d=cycle_s/86400 if cycle_s is not None else None,
        FE_cells_year=FE,Fafterharvest_cells_year=FA,FM_cells_year=FM,
        FH_cells_year=FH,Fin_cells_year=fin_potential if valid else None,
        potential_Fin_cells_year=fin_potential,
        accepted_input_cells_year=fin_potential*p.accepted_fraction if valid else None,
        Njs_rpm=Njs*60,Nupper_rpm=Nupper*60,minPV_W_m3=factor*Njs**3,
        operatingPV_W_m3=power,AO_cm2_ml=XO/p.surface_density_cells_m2/100,
        gasflow_L_min=p.gas_superficial_velocity_m_s*g['tank_area_m2']*60000,
        kLa_s_1=kla,Reynolds_number=Re,turbulent_screen_pass=Re>=p.turbulent_screen_Re,
        feasible=suspension_ok,expansion_valid=expansion_valid,
        activeconstraint=active,upper_bound_status='assumed_power_envelope' if p.qualified_speed_s_1 is None else 'externally_supplied_speed_bound',
        **g)
