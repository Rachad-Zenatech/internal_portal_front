import { useState, useMemo, type ReactNode } from "react";
import { Mail, MapPin, Phone, ReceiptText, Search, Users } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";

import { AddBusinessContactDialog } from "@/components/Configurations/AddBusinessContactDialog";
import { DeleteBusinessContactDialog } from "@/components/Configurations/DeleteBusinessContactDialog";
import { EditBusinessContactDialog } from "@/components/Configurations/EditBusinessContactDialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
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
  const columns = useMemo<ColumnDef<BusinessContactReference>[]>(
    () => [
      {
        accessorKey: "display_name",
        header: contactLabel,
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-slate-900 dark:text-zinc-50">{row.original.display_name}</div>
            <div className="text-xs text-slate-500 dark:text-zinc-400">{row.original.contact_type}</div>
          </div>
        ),
      },
      {
        id: "account",
        header: "Accounting Account",
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-slate-900 dark:text-zinc-50">{row.original.account_number} &middot; {row.original.account_name}</div>
            <div className="text-xs text-slate-500 dark:text-zinc-400">{row.original.account_type}</div>
          </div>
        ),
      },
      {
        accessorKey: "full_name",
        header: "Contact",
        cell: ({ row }) => row.original.full_name || "-",
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => row.original.email ? (
          <span className="inline-flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" />{row.original.email}</span>
        ) : "-",
      },
      {
        accessorKey: "phone_numbers",
        header: "Phone",
        cell: ({ row }) => row.original.phone_numbers ? (
          <span className="inline-flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" />{row.original.phone_numbers}</span>
        ) : "-",
      },
      {
        id: "address",
        header: "Address",
        cell: ({ row }) => row.original.bill_address || row.original.ship_address ? (
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate max-w-[200px] inline-block align-bottom">{compactLines(row.original.bill_address || row.original.ship_address)}</span>
          </span>
        ) : "-",
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <EditBusinessContactDialog contact={row.original} />
            <DeleteBusinessContactDialog contact={row.original} />
          </div>
        ),
      },
    ],
    [contactLabel]
  );

  const table = useReactTable({
    data: contacts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <Card className="flex min-h-[360px] flex-col overflow-hidden rounded-lg">
      <div className="flex items-center justify-between border-b px-4 py-3 bg-slate-50/50 dark:bg-transparent">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-zinc-50">{title}</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">{description} &middot; {total.toLocaleString("en-US")} matching</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{badge}</Badge>
          {action}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-slate-50 shadow-sm dark:bg-zinc-900">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-slate-50 hover:bg-slate-50 border-t-0 dark:bg-zinc-900 dark:hover:bg-zinc-900">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-12 font-semibold text-slate-900 dark:text-zinc-50">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: columns.length }).map((__, cell) => (
                    <TableCell key={cell}><Skeleton className="h-5 w-36" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="border-slate-100 dark:border-zinc-800 hover:bg-slate-50/50 dark:hover:bg-zinc-800/50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">
                  No matching contacts found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="border-t p-4 bg-slate-50/50 dark:bg-zinc-900/50">
        <DataTablePagination table={table} noun="contact(s)" />
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
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-lg p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Active contacts</p><p className="mt-1 text-2xl font-semibold">{activeCount}</p></div><Users className="h-5 w-5 text-slate-400" /></div></Card>
        <Card className="rounded-lg p-4"><p className="text-sm text-slate-500">AR customers</p><p className="mt-1 text-2xl font-semibold">{arQuery.data?.ar_count ?? 0}</p></Card>
        <Card className="rounded-lg p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">AP payees</p><p className="mt-1 text-2xl font-semibold">{apQuery.data?.ap_count ?? 0}</p></div><ReceiptText className="h-5 w-5 text-slate-400" /></div></Card>
      </div>

      <Tabs defaultValue="ar" className="min-h-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList className="grid w-full sm:max-w-[520px] grid-cols-2 h-10">
            <TabsTrigger value="ar">A/R Customers ({arQuery.data?.ar_count ?? 0})</TabsTrigger>
            <TabsTrigger value="ap">A/P Payees ({apQuery.data?.ap_count ?? 0})</TabsTrigger>
          </TabsList>
          
          <div className="relative w-full sm:w-[320px] lg:w-[400px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input 
              value={search} 
              onChange={(event) => setSearch(event.target.value)} 
              placeholder="Search AR and AP contacts..." 
              className="pl-9 h-10 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800" 
            />
          </div>
        </div>

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