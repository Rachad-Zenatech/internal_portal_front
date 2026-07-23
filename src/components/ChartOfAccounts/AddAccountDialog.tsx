import { useState, useRef } from "react";
import type { ChartOfAccount } from "@/types/chartOfAccount";
import { useInsertChartOfAccount } from "@/hooks/useChartOfAccount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Info } from "lucide-react";
import { toast } from "sonner";

const detailTypePlaceholder = `Purpose: Used for day-to-day operating computer costs.

Typical transactions:
- Mouse
- Keyboard
- Laptop charger
- Antivirus subscription
- Adobe subscription
- Microsoft Office
- Internet bill
- Network repair
- Small computer accessories

Do NOT use for:
- Purchasing new computers
- Servers
- Capital equipment
- Fixed assets

Keywords: 
software, subscription, internet, repair, accessories, supplies, maintenance

Capitalization: Expense immediately.`;

export default function AddAccountDialog() {
  const { mutate, isPending: insertingData } = useInsertChartOfAccount();
  const [open, setOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  
  // Custom Dragging State
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX - currentPos.current.x, y: e.clientY - currentPos.current.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging.current && dragRef.current) {
      currentPos.current = { x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y };
      dragRef.current.style.transform = `translate(${currentPos.current.x}px, ${currentPos.current.y}px)`;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const [newAccount, setNewAccount] = useState<ChartOfAccount>({
    account_number: "", account_type: "", detail_type: "", account_name: "", is_active: true,
  });

  const addAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutate(newAccount, {
      onSuccess: () => {
        setNewAccount({ account_number: "", account_type: "", detail_type: "", account_name: "", is_active: true });
        toast("Account has been created", { description: "Your new account has been saved successfully.", position: "top-center" });
        setOpen(false);
      },
      onError: (error: Error) => {
        toast.error("Insert Failed", { description: error.message || "There was an issue saving the account.", position: "top-center" });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Chart of Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Add New Account</DialogTitle>
          <DialogDescription>Manually create a single ledger account entry.</DialogDescription>
        </DialogHeader>
        <form onSubmit={addAccount} className="flex flex-col gap-6 mt-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input placeholder="Account Number" value={newAccount.account_number} disabled={insertingData} onChange={(e) => setNewAccount({ ...newAccount, account_number: e.target.value })} required />
              <Input placeholder="Account Name" value={newAccount.account_name} disabled={insertingData} onChange={(e) => setNewAccount({ ...newAccount, account_name: e.target.value })} required />
              <Input placeholder="Account Type" value={newAccount.account_type} disabled={insertingData} onChange={(e) => setNewAccount({ ...newAccount, account_type: e.target.value })} required />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Detail Type</span>
              <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full" onClick={() => setInfoOpen(true)}>
                <Info className="h-4 w-4 text-slate-500" />
              </Button>
            </div>
            <Textarea placeholder={detailTypePlaceholder} value={newAccount.detail_type} disabled={insertingData} onChange={(e) => setNewAccount({ ...newAccount, detail_type: e.target.value })} className="min-h-[120px]" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={insertingData}>
              {insertingData ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</> : "Add Account"}
            </Button>
          </div>
        </form>

        {infoOpen && (
          <div ref={dragRef} className="fixed z-[100] w-[500px] shadow-2xl bg-white border border-slate-200 rounded-lg top-[20%] left-[60%] flex flex-col pointer-events-auto" style={{ transform: `translate(${currentPos.current.x}px, ${currentPos.current.y}px)` }}>
            <div 
              className="cursor-move bg-slate-100 rounded-t-lg py-3 px-4 border-b flex items-center justify-between"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <div>
                <h3 className="text-base font-semibold">Detail Type Template</h3>
                <p className="text-sm text-slate-500">Use the following template structure for the detail type field.</p>
              </div>
              <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setInfoOpen(false)}>
                <span className="sr-only">Close</span>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
              </Button>
            </div>
            <div className="p-4">
              <div className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 p-4 rounded-md border">{detailTypePlaceholder}</div>
              <div className="flex justify-end mt-4">
                <Button type="button" onClick={() => setInfoOpen(false)}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
