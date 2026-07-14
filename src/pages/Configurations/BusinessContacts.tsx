import { useState } from "react";
import { Mail, MapPin, Phone, ReceiptText, Search, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBusinessContacts } from "@/hooks/useBusinessContact";

const compactLines = (value?: string | null) =>
  (value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");

export default function BusinessContacts() {
  const [search, setSearch] = useState("");
  const { data, isPending } = useBusinessContacts(search);

  const contacts = data?.items || [];
  const sourceFile = data?.source_file || "zenatech_usa_customer_contact_list.csv";
  const visibleCount = contacts.length;

  return (
    <div className="flex h-full min-h-0 flex-col space-y-6 pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Contacts</h1>
          <p className="mt-1 text-slate-500">
            Customer and contact references for business configuration.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full min-w-[280px] lg:w-[360px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search contacts"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Active contacts</p>
              <p className="mt-1 text-2xl font-semibold">{data?.active_count ?? 0}</p>
            </div>
            <Users className="h-5 w-5 text-slate-400" />
          </div>
        </Card>
        <Card className="rounded-lg p-4">
          <p className="text-sm text-slate-500">Visible rows</p>
          <p className="mt-1 text-2xl font-semibold">{visibleCount}</p>
        </Card>
        <Card className="rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Default account</p>
              <p className="mt-1 text-lg font-semibold">1100 Accounts Receivable</p>
            </div>
            <ReceiptText className="h-5 w-5 text-slate-400" />
          </div>
        </Card>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-700">
              Source: {sourceFile}
            </p>
            <p className="text-xs text-slate-500">
              {data?.total ?? 0} matching contact{data?.total === 1 ? "" : "s"}
            </p>
          </div>
          <Badge variant="secondary">Customer contacts</Badge>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-white">
              <TableRow>
                <TableHead className="w-[260px]">Customer</TableHead>
                <TableHead className="w-[230px]">Accounting Account</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address Signal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending
                ? Array.from({ length: 8 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-44" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-52" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-72" /></TableCell>
                    </TableRow>
                  ))
                : contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <div className="font-medium text-slate-900">
                          {contact.display_name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {contact.contact_type}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">
                          {contact.account_number} · {contact.account_name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {contact.account_type}
                        </div>
                      </TableCell>
                      <TableCell>{contact.full_name || "-"}</TableCell>
                      <TableCell>
                        {contact.email ? (
                          <span className="inline-flex items-center gap-2">
                            <Mail className="h-4 w-4 text-slate-400" />
                            {contact.email}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {contact.phone_numbers ? (
                          <span className="inline-flex items-center gap-2">
                            <Phone className="h-4 w-4 text-slate-400" />
                            {contact.phone_numbers}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="max-w-[420px]">
                        {contact.bill_address || contact.ship_address ? (
                          <span className="inline-flex items-center gap-2">
                            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="truncate">
                              {compactLines(contact.bill_address || contact.ship_address)}
                            </span>
                          </span>
                        ) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
              {!isPending && contacts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                    No business contacts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
