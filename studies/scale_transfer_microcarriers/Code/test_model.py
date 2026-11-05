"""Invariant and boundary tests; these are not empirical model validation."""
from dataclasses import replace
import math
import unittest
from model import Parameters, evaluate, geometry
from run_scenarios import maturation_crossover

class ModelTests(unittest.TestCase):
    def setUp(self):
        self.p=Parameters()

    def test_geometry_volume_conservation(self):
        g=geometry(self.p,.003)
        self.assertAlmostEqual(g['tank_area_m2']*g['liquid_height_m'],.003)

    def test_reference_suspension_anchor(self):
        r=evaluate(self.p,20,3)
        self.assertAlmostEqual(r['Njs_rpm'],60)

    def test_surface_units(self):
        r=evaluate(self.p,20)
        self.assertEqual(r['surface_m2_m3'],2000)
        self.assertEqual(r['Xsurface_cells_m3']/1e6,400000)

    def test_oxygen_independent_numeric_check(self):
        r=evaluate(self.p,40,pmax_W_m3=2)
        self.assertAlmostEqual(r['kLa_s_1'],.0004135665084423747,places=15)
        self.assertAlmostEqual(r['AO_cm2_ml'],33.08532067538998,places=10)

    def test_imposed_power_bound(self):
        r=evaluate(self.p,40)
        self.assertAlmostEqual(r['operatingPV_W_m3'],5)

    def test_infinite_oxygen_limit_surface(self):
        r=evaluate(replace(self.p,oxygen_transfer_multiplier=1e12),80,maturation_ratio=1e9)
        self.assertEqual(r['Xharvest_cells_m3'],r['Xsurface_cells_m3'])
        self.assertEqual(r['Fin_cells_year'],r['Fafterharvest_cells_year'])

    def test_large_surface_limit_oxygen(self):
        r=evaluate(self.p,10000)
        self.assertEqual(r['Xharvest_cells_m3'],r['Xoxygen_cells_m3'])

    def test_stage_conservation(self):
        r=evaluate(replace(self.p,harvest_capacity_cells_year=1e14),40)
        self.assertLessEqual(r['Fin_cells_year'],r['Fafterharvest_cells_year'])
        self.assertLessEqual(r['Fin_cells_year'],r['FM_cells_year'])
        self.assertLessEqual(r['Fin_cells_year'],r['FH_cells_year'])
        self.assertLessEqual(r['accepted_input_cells_year'],r['Fin_cells_year'])

    def test_zero_recovery_is_zero_delivery(self):
        self.assertEqual(evaluate(replace(self.p,harvest_recovery=0),40)['Fin_cells_year'],0)

    def test_double_vessels_unconstrained(self):
        a=evaluate(self.p,20,maturation_ratio=1e6)
        b=evaluate(self.p,20,vessel_count=200,maturation_ratio=1e6)
        self.assertAlmostEqual(b['Fin_cells_year']/a['Fin_cells_year'],2)

    def test_harvest_service_cannot_be_bypassed(self):
        p=replace(self.p,harvest_capacity_cells_year=1e12)
        self.assertEqual(evaluate(p,20)['Fin_cells_year'],evaluate(p,80)['Fin_cells_year'])

    def test_oxygen_demand_and_calibration(self):
        a=evaluate(self.p,40)
        b=evaluate(self.p,40,qO2_multiplier=2)
        c=evaluate(replace(self.p,oxygen_transfer_multiplier=2),40)
        self.assertAlmostEqual(b['AO_cm2_ml']/a['AO_cm2_ml'],.5)
        self.assertAlmostEqual(c['AO_cm2_ml']/a['AO_cm2_ml'],2)

    def test_crossover_switches_endpoint_constraint(self):
        a=evaluate(self.p,40,pmax_W_m3=2)['AO_cm2_ml']
        self.assertLess(evaluate(self.p,a*.99,pmax_W_m3=2)['Xsurface_cells_m3'],evaluate(self.p,a*.99,pmax_W_m3=2)['Xoxygen_cells_m3'])
        self.assertGreater(evaluate(self.p,a*1.01,pmax_W_m3=2)['Xsurface_cells_m3'],evaluate(self.p,a*1.01,pmax_W_m3=2)['Xoxygen_cells_m3'])

    def test_equal_total_volume_equivalence(self):
        a=evaluate(self.p,40,500,200)
        b=evaluate(self.p,40,25000,4)
        self.assertTrue(a['feasible'] and b['feasible'])
        self.assertAlmostEqual(a['Fin_cells_year']/b['Fin_cells_year'],1)

    def test_maturation_plateau_and_release(self):
        a=evaluate(self.p,80,pmax_W_m3=2,maturation_ratio=.1)
        b=evaluate(self.p,80,pmax_W_m3=20,maturation_ratio=.1)
        c=evaluate(self.p,80,pmax_W_m3=20,maturation_ratio=1)
        self.assertEqual(a['Fin_cells_year'],b['Fin_cells_year'])
        self.assertGreater(c['Fin_cells_year'],b['Fin_cells_year'])

    def test_infeasible_is_missing_not_biological_zero(self):
        r=evaluate(replace(self.p,reference_Njs_s_1=100),40)
        self.assertFalse(r['feasible'])
        self.assertIsNone(r['accepted_input_cells_year'])
        self.assertGreater(r['potential_Fin_cells_year'],0)

    def test_invalid_inputs_rejected(self):
        for p in [replace(self.p,oxygen_demand_mol_cell_s=0),replace(self.p,accepted_fraction=1.1),replace(self.p,oxygen_minimum_mol_m3=.21),replace(self.p,maturation_cycle_s=-1)]:
            with self.assertRaises(ValueError): evaluate(p,40)
        for kwargs in [{'surface_cm2_ml':0},{'surface_cm2_ml':40,'vessel_count':0},{'surface_cm2_ml':float('nan')}]:
            with self.assertRaises(ValueError): evaluate(self.p,**kwargs)

    def test_endpoint_below_inoculum_not_predicted_growth(self):
        r=evaluate(replace(self.p,inoculum_cells_m3=1e15),40)
        self.assertFalse(r['expansion_valid'])
        self.assertIsNone(r['Fin_cells_year'])

    def test_longer_growth_occupancy_reduces_capacity(self):
        a=evaluate(self.p,40,maturation_ratio=100)
        b=evaluate(replace(self.p,doubling_time_s=self.p.doubling_time_s*2),40,maturation_ratio=100)
        self.assertLess(b['FE_cells_year'],a['FE_cells_year'])

    def test_maturation_threshold_solution(self):
        t=maturation_crossover(self.p,5,.5)
        if t['status']=='crossing_in_domain':
            r=evaluate(self.p,t['surface_cm2_ml'],maturation_ratio=.5)
            self.assertAlmostEqual(r['Fafterharvest_cells_year']/r['FM_cells_year'],1)
        else:
            self.assertEqual(t['status'],'already_binding_at_domain_start')

    def test_nonfinite_parameters_rejected_including_signed_exponent(self):
        for field in ('suspension_diameter_exponent', 'gas_superficial_velocity_m_s',
                      'harvest_capacity_cells_year', 'qualified_speed_s_1'):
            for value in (float('nan'),float('inf'),-float('inf')):
                with self.subTest(field=field,value=value):
                    with self.assertRaises(ValueError):
                        evaluate(replace(self.p,**{field:value}),40)

    def test_zero_service_capacity_and_anoxic_minimum_are_valid(self):
        r=evaluate(replace(self.p,harvest_capacity_cells_year=0,
                           oxygen_minimum_mol_m3=0),40)
        self.assertEqual(r['Fin_cells_year'],0)
        self.assertEqual(r['activeconstraint'],'harvest_service')

    def test_invalid_geometry_and_boolean_counts_rejected(self):
        for ratio in (1,1.5):
            with self.assertRaises(ValueError):
                evaluate(replace(self.p,impeller_tank_ratio=ratio),40)
        with self.assertRaises(ValueError):
            evaluate(replace(self.p,impeller_count=True),40)
        with self.assertRaises(ValueError):
            evaluate(self.p,40,vessel_count=True)
        with self.assertRaises(ValueError):
            geometry(self.p,float('nan'))

    def test_turbulence_flag_exposes_unqualified_low_power_case(self):
        r=evaluate(self.p,20,3,pmax_W_m3=2)
        self.assertLess(r['Reynolds_number'],10000)
        self.assertFalse(r['turbulent_screen_pass'])


class ScenarioRegisterTests(unittest.TestCase):
    def register(self):
        import json
        from pathlib import Path
        return json.loads((Path(__file__).parent/'parameters.json').read_text())

    def test_decimal_grid_is_inclusive_without_drift(self):
        from run_scenarios import inclusive_sweep
        self.assertEqual(inclusive_sweep([.05,.08,.01]),[.05,.06,.07,.08])
        self.assertEqual(inclusive_sweep([1,1,.5]),[1.])
        self.assertEqual(len(inclusive_sweep([.3,3,.025])),109)

    def test_malformed_grids_fail_explicitly(self):
        from run_scenarios import inclusive_sweep
        for spec in ([1,2,0],[2,1,1],[0,1,.3],[0,float('inf'),1],[True,2,1],[1,2]):
            with self.subTest(spec=spec), self.assertRaises(ValueError):
                inclusive_sweep(spec)

    def test_modified_json_register_controls_all_scenarios(self):
        import csv,json,tempfile
        from pathlib import Path
        from run_scenarios import generate
        reg=self.register()
        replacements={'surface_cm2_ml':[12,16,2],'pmax_W_m3':[3,7],
          'maturation_volume_ratio':[.2,.8],'qO2_multiplier':[.5,2],
          'architecture_vessel_count_and_volume_L':[[8,125]],
          'loading_base_vessel_count_and_volume_L':[8,125],
          'maturation_ratio_sweep':[.2,.4,.1],
          'base_surface_cm2_ml':30,'base_pmax_W_m3':7,'base_maturation_volume_ratio':.4,
          'intervention_surface_cm2_ml':[15,25],'allocation_qO2_sweep':[.5,2,.5]}
        for key,value in replacements.items():reg['scenario_inputs'][key]['value']=value
        # Exercise the actual JSON serialization path, not a default-only assertion.
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);(root/'register.json').write_text(json.dumps(reg))
            summary=generate(json.loads((root/'register.json').read_text()),root)
            def rows(name):
                with (root/name).open() as stream:
                    return list(csv.DictReader(stream))
            self.assertEqual(summary['row_counts']['loading.csv'],6)
            self.assertEqual(summary['row_counts']['oxygen_demand.csv'],12)
            self.assertEqual(summary['row_counts']['interventions.csv'],8)
            self.assertEqual(summary['row_counts']['downstream_loading.csv'],6)
            self.assertEqual({float(r['pmax_W_m3']) for r in rows('downstream_loading.csv')},{7})
            self.assertEqual({float(r['maturation_volume_ratio']) for r in rows('downstream_loading.csv')},{.2,.8})
            self.assertEqual(summary['row_counts']['maturation.csv'],3)
            self.assertEqual(summary['row_counts']['architecture.csv'],1)
            self.assertEqual({float(r['surface_cm2_ml']) for r in rows('loading.csv')},{12,14,16})
            self.assertEqual({float(r['pmax_W_m3']) for r in rows('loading.csv')},{3,7})
            self.assertTrue(all(float(r['total_expansion_volume_m3'])==1 for r in rows('loading.csv')))
            self.assertTrue(all(float(r['maturation_volume_ratio'])==.4 for r in rows('loading.csv')))
            self.assertEqual({float(r['surface_cm2_ml']) for r in rows('interventions.csv')},{15,25})
            self.assertEqual({float(r['maturation_volume_ratio']) for r in rows('interventions.csv')},{.2,.8})
            self.assertEqual({float(r['qO2_multiplier']) for r in rows('oxygen_demand.csv')},{.5,2})
            self.assertEqual({float(r['surface_cm2_ml']) for r in rows('maturation.csv')},{30})
            self.assertEqual({float(r['pmax_W_m3']) for r in rows('maturation.csv')},{7})
            self.assertEqual(rows('architecture.csv')[0]['architecture'],'array_8x125L')
            self.assertNotIn('maturation_volume_ratio_required_at_A40_pmax5',summary)
            boundary=rows('allocation_boundary.csv');q=[float(r['qO2_multiplier']) for r in boundary]
            self.assertEqual(q,sorted(set(q)));self.assertIn(1,q)
            self.assertIn(summary['allocation_qcritical'],q)
            self.assertEqual(summary['allocation_boundary_row_count'],len(q))
            self.assertTrue(all(float(r['surface_cm2_ml'])==30 and float(r['pmax_W_m3'])==7 for r in boundary))

    def test_allocation_boundary_has_exact_knee_and_correct_capacity(self):
        import csv,tempfile
        from pathlib import Path
        from run_scenarios import generate
        with tempfile.TemporaryDirectory() as temp:
            summary=generate(self.register(),temp)
            with (Path(temp)/'allocation_boundary.csv').open() as stream:
                rows=list(csv.DictReader(stream))
            self.assertEqual(len(rows),110)
            critical=summary['allocation_qcritical']
            self.assertAlmostEqual(critical,1.2723516609938865)
            for row in rows:
                required=float(row['required_maturation_volume_ratio'])
                self.assertAlmostEqual(required,float(row['Fafterharvest_cells_year'])/float(row['FM_cells_year']))
                q=float(row['qO2_multiplier'])
                self.assertGreater(float(row['Xharvest_cells_m3']),1e11)
                if q<critical:self.assertEqual(row['upstream_constraint'],'surface')
                if q>critical:self.assertEqual(row['upstream_constraint'],'oxygen')
            self.assertAlmostEqual(float(rows[0]['required_maturation_volume_ratio']),.7111111111111111)
            self.assertLess(float(rows[-1]['required_maturation_volume_ratio']),.7111111111111111)

if __name__=='__main__': unittest.main()
