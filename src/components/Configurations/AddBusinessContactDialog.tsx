import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateBusinessContact } from "@/hooks/useBusinessContact";

const emptyForm = { display_name: "", full_name: "", email: "", phone_numbers: "", bill_address: "", ship_address: "" };

export function AddBusinessContactDialog({ accountSide }: { accountSide: "ar" | "ap" }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const mutation = useCreateBusinessContact();
  const isAr = accountSide === "ar";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await mutation.mutateAsync({
        account_side: accountSide,
        display_name: form.display_name.trim(),
        full_name: form.full_name.trim() || null,
        email: form.email.trim() || null,
        phone_numbers: form.phone_numbers.trim() || null,
        bill_address: form.bill_address.trim() || null,
        ship_address: form.ship_address.trim() || null,
      });
      setForm(emptyForm);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create business contact.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setError(null); }}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4" />{isAr ? "New A/R Customer" : "New A/P Payee"}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[620px]">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{isAr ? "New A/R Customer" : "New A/P Payee"}</DialogTitle>
            <DialogDescription>
              This contact will be assigned to {isAr ? "1100 Accounts Receivable" : "2000 Accounts Payable"}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label htmlFor={`${accountSide}-display-name`}>Business name</Label><Input id={`${accountSide}-display-name`} required value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Contact name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Phone</Label><Input value={form.phone_numbers} onChange={(e) => setForm({ ...form, phone_numbers: e.target.value })} /></div>
            <div className="space-y-2"><Label>Billing address</Label><Textarea value={form.bill_address} onChange={(e) => setForm({ ...form, bill_address: e.target.value })} /></div>
            <div className="space-y-2"><Label>Shipping address</Label><Textarea value={form.ship_address} onChange={(e) => setForm({ ...form, ship_address: e.target.value })} /></div>
          </div>
          {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={mutation.isPending || !form.display_name.trim()}>{mutation.isPending ? "Adding..." : "Add contact"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
