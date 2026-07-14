import { Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useDeleteBusinessContact } from "@/hooks/useBusinessContact";
import type { BusinessContactReference } from "@/types/businessContact";

export function DeleteBusinessContactDialog({ contact }: { contact: BusinessContactReference }) {
  const mutation = useDeleteBusinessContact();
  return <AlertDialog><AlertDialogTrigger asChild><Button type="button" variant="ghost" size="icon-sm" className="text-destructive" aria-label={`Delete ${contact.display_name}`}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {contact.display_name}?</AlertDialogTitle><AlertDialogDescription>This removes the contact from the {contact.contact_type === "customer" ? "A/R Customers" : "A/P Payees"} tab. It does not change GL data.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate(contact.id)}>{mutation.isPending ? "Deleting..." : "Delete"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
