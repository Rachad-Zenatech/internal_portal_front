// src/pages/ConsolidatedTrialBalance.tsx

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ConsolidatedTrialBalance() {
  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">
          Consolidated Trial Balance
        </h1>
        <p className="text-muted-foreground">
          View all companies or consolidate by entity.
        </p>
      </div>

      <Card>
        <CardContent className="flex gap-4 p-6">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium">
              Entity
            </label>

            <select className="w-full rounded-md border p-2">
              <option value="">All Companies</option>
              <option value="ZT">ZT</option>
              <option value="ABC">ABC</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button>
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Table */}
      <Card>
        <CardContent className="p-6">
          Trial Balance Results Here
        </CardContent>
      </Card>
    </div>
  );
}