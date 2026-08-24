import { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../hooks/useToast';
import { Plus } from 'lucide-react';

interface VehicleType { id: string; name: string; }
interface PricingRule {
  id: string;
  vehicleTypeId: string;
  tripType: string;
  baseFare: string | number;
  perKmRate: string | number;
  perHourRate: string | number;
  driverAllowanceDay: string | number;
  nightChargeMultiplier: string | number;
  airportSurcharge: string | number;
  statePermitCharge: string | number;
  isActive: boolean;
  vehicleType: { name: string } | null;
}
interface TaxConfig { id: string; name: string; cgstRate: string | number; sgstRate: string | number; igstRate: string | number; isActive: boolean; isDefault: boolean; }

const TRIP_TYPES = ['LOCAL', 'OUTSTATION', 'AIRPORT_TRANSFER', 'ONE_WAY', 'ROUND_TRIP', 'FULL_DAY_RENTAL', 'CUSTOM'];

const emptyRuleForm = {
  vehicleTypeId: '', tripType: 'LOCAL', baseFare: '0', perKmRate: '0', perHourRate: '0',
  driverAllowanceDay: '0', nightChargeMultiplier: '1', extraKmRate: '0', airportSurcharge: '0', statePermitCharge: '0',
};

const emptyTaxForm = { name: '', cgstRate: '2.5', sgstRate: '2.5', igstRate: '0', isActive: true, isDefault: true };

export default function AdminPricing() {
  const toast = useToast();
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [taxConfigs, setTaxConfigs] = useState<TaxConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ruleForm, setRuleForm] = useState(emptyRuleForm);
  const [taxForm, setTaxForm] = useState(emptyTaxForm);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [isSavingTax, setIsSavingTax] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setIsLoading(true);
      const [vt, pr, tc] = await Promise.all([
        api.get('/vehicle-types'),
        api.get('/pricing/rules'),
        api.get('/pricing/tax'),
      ]);
      setVehicleTypes(vt.data.data);
      setRules(pr.data.data);
      setTaxConfigs(tc.data.data);
    } catch (error) {
      toast('Failed to load pricing data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const startEdit = (rule: PricingRule) => {
    setEditingRuleId(rule.id);
    setRuleForm({
      vehicleTypeId: rule.vehicleTypeId, tripType: rule.tripType,
      baseFare: String(rule.baseFare), perKmRate: String(rule.perKmRate), perHourRate: String(rule.perHourRate),
      driverAllowanceDay: String(rule.driverAllowanceDay), nightChargeMultiplier: String(rule.nightChargeMultiplier),
      extraKmRate: '0', airportSurcharge: String(rule.airportSurcharge), statePermitCharge: String(rule.statePermitCharge),
    });
  };

  const cancelEdit = () => { setEditingRuleId(null); setRuleForm(emptyRuleForm); };

  const saveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleForm.vehicleTypeId) { toast('Select a vehicle type', 'error'); return; }
    try {
      setIsSavingRule(true);
      if (editingRuleId) {
        await api.put(`/pricing/rules/${editingRuleId}`, ruleForm);
        toast('Pricing rule updated', 'success');
      } else {
        await api.post('/pricing/rules', ruleForm);
        toast('Pricing rule created', 'success');
      }
      cancelEdit();
      fetchAll();
    } catch (error: any) {
      toast(error?.response?.data?.message || 'Failed to save pricing rule', 'error');
    } finally {
      setIsSavingRule(false);
    }
  };

  const saveTax = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taxForm.name.trim()) { toast('Tax config name is required', 'error'); return; }
    try {
      setIsSavingTax(true);
      await api.post('/pricing/tax', taxForm);
      toast('Tax configuration created', 'success');
      setTaxForm(emptyTaxForm);
      fetchAll();
    } catch (error: any) {
      toast(error?.response?.data?.message || 'Failed to save tax configuration', 'error');
    } finally {
      setIsSavingTax(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading pricing configuration...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pricing</h1>

      <Card>
        <CardHeader><CardTitle>{editingRuleId ? 'Edit Pricing Rule' : 'New Pricing Rule'}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveRule} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Select label="Vehicle Type" value={ruleForm.vehicleTypeId} onChange={(e) => setRuleForm({ ...ruleForm, vehicleTypeId: e.target.value })} disabled={!!editingRuleId} required>
                <option value="">Select...</option>
                {vehicleTypes.map((vt) => <option key={vt.id} value={vt.id}>{vt.name}</option>)}
              </Select>
              <Select label="Trip Type" value={ruleForm.tripType} onChange={(e) => setRuleForm({ ...ruleForm, tripType: e.target.value })} disabled={!!editingRuleId}>
                {TRIP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
              <Input label="Base Fare (₹)" type="number" value={ruleForm.baseFare} onChange={(e) => setRuleForm({ ...ruleForm, baseFare: e.target.value })} />
              <Input label="Per KM Rate (₹)" type="number" value={ruleForm.perKmRate} onChange={(e) => setRuleForm({ ...ruleForm, perKmRate: e.target.value })} />
              <Input label="Per Hour Rate (₹)" type="number" value={ruleForm.perHourRate} onChange={(e) => setRuleForm({ ...ruleForm, perHourRate: e.target.value })} />
              <Input label="Driver Allowance (₹/day)" type="number" value={ruleForm.driverAllowanceDay} onChange={(e) => setRuleForm({ ...ruleForm, driverAllowanceDay: e.target.value })} />
              <Input label="Night Charge Multiplier" type="number" step="0.1" value={ruleForm.nightChargeMultiplier} onChange={(e) => setRuleForm({ ...ruleForm, nightChargeMultiplier: e.target.value })} />
              <Input label="Airport Surcharge (₹)" type="number" value={ruleForm.airportSurcharge} onChange={(e) => setRuleForm({ ...ruleForm, airportSurcharge: e.target.value })} />
              <Input label="State Permit Charge (₹)" type="number" value={ruleForm.statePermitCharge} onChange={(e) => setRuleForm({ ...ruleForm, statePermitCharge: e.target.value })} />
            </div>
            <div className="flex gap-3">
              {editingRuleId && <Button type="button" variant="outline" onClick={cancelEdit}>Cancel</Button>}
              <Button type="submit" isLoading={isSavingRule} className="gap-2"><Plus className="h-4 w-4" />{editingRuleId ? 'Save Changes' : 'Add Rule'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Existing Pricing Rules</CardTitle></CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-4">
              No pricing rules configured yet. Bookings will quote ₹0 until at least one rule is added above.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Vehicle Type</th>
                    <th className="px-4 py-2">Trip Type</th>
                    <th className="px-4 py-2">Base Fare</th>
                    <th className="px-4 py-2">Per KM</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rules.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2">{r.vehicleType?.name || '—'}</td>
                      <td className="px-4 py-2">{r.tripType}</td>
                      <td className="px-4 py-2">₹{Number(r.baseFare).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2">₹{Number(r.perKmRate).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-2 text-right"><Button size="sm" variant="outline" onClick={() => startEdit(r)}>Edit</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>GST / Tax Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {taxConfigs.length > 0 && (
            <div className="space-y-2">
              {taxConfigs.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2 text-sm">
                  <span className="font-medium">{t.name} {t.isDefault && <span className="text-brand-600">(default)</span>}</span>
                  <span className="text-slate-500">CGST {t.cgstRate}% + SGST {t.sgstRate}% + IGST {t.igstRate}%</span>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={saveTax} className="grid grid-cols-2 gap-4 md:grid-cols-4 items-end">
            <Input label="Name" value={taxForm.name} onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })} placeholder="e.g. Standard GST" required />
            <Input label="CGST %" type="number" step="0.1" value={taxForm.cgstRate} onChange={(e) => setTaxForm({ ...taxForm, cgstRate: e.target.value })} />
            <Input label="SGST %" type="number" step="0.1" value={taxForm.sgstRate} onChange={(e) => setTaxForm({ ...taxForm, sgstRate: e.target.value })} />
            <Input label="IGST %" type="number" step="0.1" value={taxForm.igstRate} onChange={(e) => setTaxForm({ ...taxForm, igstRate: e.target.value })} />
            <Button type="submit" isLoading={isSavingTax} className="col-span-2 md:col-span-4">Add / Set as Default Tax Config</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
