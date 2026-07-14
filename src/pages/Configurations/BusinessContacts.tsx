import { useState, type ReactNode } from "react";
import { Mail, MapPin, Phone, ReceiptText, Search, Users } from "lucide-react";

import { AddBusinessContactDialog } from "@/components/Configurations/AddBusinessContactDialog";
import { DeleteBusinessContactDialog } from "@/components/Configurations/DeleteBusinessContactDialog";
import { EditBusinessContactDialog } from "@/components/Configurations/EditBusinessContactDialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBusinessContacts } from "@/hooks/useBusinessContact";
import type { BusinessContactReference } from "@/types/businessContact";

const compactLines = (value?: string | null) =>
  (value || "").split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 2).join(", ");

function ContactSection({
  title,
  description,
  badge,
  contactLabel,
  contacts,
  total,
  isPending,
  action,
}: {
  title: string;
  description: string;
  badge: string;
  contactLabel: string;
  contacts: BusinessContactReference[];
  total: number;
  isPending: boolean;
  action: ReactNode;
}) {
  return (
    <Card className="flex min-h-[360px] flex-col overflow-hidden rounded-lg">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{description} &middot; {total.toLocaleString("en-US")} matching</p>
        </div>
        <div className="flex items-center gap-2"><Badge variant="secondary">{badge}</Badge>{action}</div>
      </div>
      <div className="max-h-[520px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-white">
            <TableRow>
              <TableHead className="w-[260px]">{contactLabel}</TableHead>
              <TableHead className="w-[230px]">Accounting Account</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="w-[96px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                {Array.from({ length: 7 }).map((__, cell) => <TableCell key={cell}><Skeleton className="h-5 w-36" /></TableCell>)}
              </TableRow>
            )) : contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell>
                  <div className="font-medium text-slate-900">{contact.display_name}</div>
                  <div className="text-xs text-slate-500">{contact.contact_type}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-slate-900">{contact.account_number} &middot; {contact.account_name}</div>
                  <div className="text-xs text-slate-500">{contact.account_type}</div>
                </TableCell>
                <TableCell>{contact.full_name || "-"}</TableCell>
                <TableCell>{contact.email ? <span className="inline-flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" />{contact.email}</span> : "-"}</TableCell>
                <TableCell>{contact.phone_numbers ? <span className="inline-flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" />{contact.phone_numbers}</span> : "-"}</TableCell>
                <TableCell className="max-w-[420px]">{contact.bill_address || contact.ship_address ? <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{compactLines(contact.bill_address || contact.ship_address)}</span></span> : "-"}</TableCell>
                <TableCell><div className="flex justify-end gap-1"><EditBusinessContactDialog contact={contact} /><DeleteBusinessContactDialog contact={contact} /></div></TableCell>
              </TableRow>
            ))}
            {!isPending && contacts.length === 0 && <TableRow><TableCell colSpan={7} className="h-24 text-center text-slate-500">No matching contacts found.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

export default function BusinessContacts() {
  const [search, setSearch] = useState("");
  const arQuery = useBusinessContacts(search, "ar");
  const apQuery = useBusinessContacts(search, "ap");
  const arContacts = arQuery.data?.items || [];
  const apContacts = apQuery.data?.items || [];
  const activeCount = arQuery.data?.active_count ?? apQuery.data?.active_count ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col space-y-6 pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Contacts</h1>
          <p className="mt-1 text-slate-500">AR customer and AP payee references, organized in separate tabs.</p>
        </div>
        <div className="relative w-full min-w-[280px] lg:w-[360px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search AR and AP contacts" className="pl-9" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-lg p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Active contacts</p><p className="mt-1 text-2xl font-semibold">{activeCount}</p></div><Users className="h-5 w-5 text-slate-400" /></div></Card>
        <Card className="rounded-lg p-4"><p className="text-sm text-slate-500">AR customers</p><p className="mt-1 text-2xl font-semibold">{arQuery.data?.ar_count ?? 0}</p></Card>
        <Card className="rounded-lg p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">AP payees</p><p className="mt-1 text-2xl font-semibold">{apQuery.data?.ap_count ?? 0}</p></div><ReceiptText className="h-5 w-5 text-slate-400" /></div></Card>
      </div>

      <Tabs defaultValue="ar" className="min-h-0">
        <TabsList className="grid w-full max-w-[520px] grid-cols-2">
          <TabsTrigger value="ar">A/R Customers ({arQuery.data?.ar_count ?? 0})</TabsTrigger>
          <TabsTrigger value="ap">A/P Payees ({apQuery.data?.ap_count ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="ar" className="mt-4">
          <ContactSection title="Accounts Receivable" description="Customer contacts mapped to 1100 Accounts Receivable" badge="AR customers" contactLabel="Customer" contacts={arContacts} total={arQuery.data?.total ?? 0} isPending={arQuery.isPending} action={<AddBusinessContactDialog accountSide="ar" />} />
        </TabsContent>
        <TabsContent value="ap" className="mt-4">
          <ContactSection title="Accounts Payable" description="Payee contacts mapped to 2000 Accounts Payable" badge="AP payees" contactLabel="Payee" contacts={apContacts} total={apQuery.data?.total ?? 0} isPending={apQuery.isPending} action={<AddBusinessContactDialog accountSide="ap" />} />
        </TabsContent>
      </Tabs>
    </div>
  );
}