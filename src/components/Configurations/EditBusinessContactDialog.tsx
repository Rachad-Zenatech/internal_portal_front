import { useEffect, useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateBusinessContact } from "@/hooks/useBusinessContact";
import type { BusinessContactReference } from "@/types/businessContact";

export function EditBusinessContactDialog({ contact }: { contact: BusinessContactReference }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ display_name: contact.display_name, full_name: contact.full_name || "", email: contact.email || "", phone_numbers: contact.phone_numbers || "", bill_address: contact.bill_address || "", ship_address: contact.ship_address || "" });
  const [error, setError] = useState<string | null>(null);
  const mutation = useUpdateBusinessContact();
  useEffect(() => { if (open) setForm({ display_name: contact.display_name, full_name: contact.full_name || "", email: contact.email || "", phone_numbers: contact.phone_numbers || "", bill_address: contact.bill_address || "", ship_address: contact.ship_address || "" }); }, [contact, open]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null);
    try {
      await mutation.mutateAsync({ id: contact.id, payload: { display_name: form.display_name.trim(), full_name: form.full_name.trim() || null, email: form.email.trim() || null, phone_numbers: form.phone_numbers.trim() || null, bill_address: form.bill_address.trim() || null, ship_address: form.ship_address.trim() || null } });
      setOpen(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to update contact."); }
  }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${contact.display_name}`}><Pencil className="h-4 w-4" /></Button></DialogTrigger><DialogContent className="sm:max-w-[620px]"><form onSubmit={submit}><DialogHeader><DialogTitle>Edit {contact.contact_type === "customer" ? "A/R Customer" : "A/P Payee"}</DialogTitle><DialogDescription>The accounting side remains {contact.account_number} {contact.account_name}.</DialogDescription></DialogHeader><div className="grid gap-4 py-5 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label>Business name</Label><Input required value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></div><div className="space-y-2"><Label>Contact name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div><div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div><div className="space-y-2 sm:col-span-2"><Label>Phone</Label><Input value={form.phone_numbers} onChange={(e) => setForm({ ...form, phone_numbers: e.target.value })} /></div><div className="space-y-2"><Label>Billing address</Label><Textarea value={form.bill_address} onChange={(e) => setForm({ ...form, bill_address: e.target.value })} /></div><div className="space-y-2"><Label>Shipping address</Label><Textarea value={form.ship_address} onChange={(e) => setForm({ ...form, ship_address: e.target.value })} /></div></div>{error && <p className="mb-3 text-sm text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={mutation.isPending || !form.display_name.trim()}>{mutation.isPending ? "Saving..." : "Save changes"}</Button></DialogFooter></form></DialogContent></Dialog>;
}
