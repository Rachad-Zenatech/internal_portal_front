import { useEffect, useState } from "react";

import {
  getPendingApprovals,
} from "../services/approvalRequestService";

import type {
  ApprovalRequest,
} from "../types/approval";

export default function ApprovalRequests() {
  const [approvals, setApprovals] =
    useState<ApprovalRequest[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadApprovals();
  }, []);

  async function loadApprovals() {
    try {
      const response =
        await getPendingApprovals();

      setApprovals(
        response.approvals
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-3xl font-bold">
        Approval Requests
      </h1>

      {loading && (
        <div>Loading...</div>
      )}

      {!loading && (
        <table className="w-full">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Predicted Account</th>
              <th>Confidence</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {approvals.map(
              (approval) => (
                <tr key={approval.id}>
                  <td>
                    {approval.vendor}
                  </td>

                  <td>
                    {
                      approval.predicted_account
                    }
                  </td>

                  <td>
                    {(
                      approval.confidence *
                      100
                    ).toFixed(0)}
                    %
                  </td>

                  <td>
                    {approval.status}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}