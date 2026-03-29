"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type {
  CommitRequest,
  CommitResponse,
  ParsedCheckin,
  ParsedMember,
  ParsedPayment,
  WizardState,
} from "@/types/import-wizard";
import { StepMembers } from "./step-members";
import { StepPayments } from "./step-payments";
import { StepCheckins } from "./step-checkins";

const STEPS = ["Alunos", "Pagamentos", "Check-ins"] as const;

interface ImportWizardProps {
  onComplete?: (result: CommitResponse) => void;
  className?: string;
}

function StepIndicator({
  current,
}: {
  current: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const stepNum = i + 1;
        const done = stepNum < current;
        const active = stepNum === current;
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={cn(
                  "h-px flex-1 min-w-8",
                  done ? "bg-foreground" : "bg-border",
                )}
              />
            )}
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold",
                done || active
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {done ? (
                <CheckCircle className="h-3.5 w-3.5" />
              ) : (
                stepNum
              )}
            </div>
            <span
              className={cn(
                "text-sm",
                active
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const INITIAL_STATE: WizardState = {
  members: [],
  excludedEmails: new Set(),
  payments: [],
  checkins: [],
  memberFileName: null,
  paymentFileName: null,
  checkinFileName: null,
};

export function ImportWizard({ onComplete, className }: ImportWizardProps) {
  const { getToken } = useAuth();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<CommitResponse | null>(null);

  const setMembers = useCallback(
    (members: ParsedMember[], fileName: string) => {
      setState((s) => ({
        ...s,
        members,
        memberFileName: fileName,
        excludedEmails: new Set(
          members.filter((m) => m.exists).map((m) => m.email),
        ),
        payments: [],
        checkins: [],
        paymentFileName: null,
        checkinFileName: null,
      }));
    },
    [],
  );

  const setExcludedEmails = useCallback((emails: Set<string>) => {
    setState((s) => ({ ...s, excludedEmails: emails }));
  }, []);

  const setPayments = useCallback(
    (payments: ParsedPayment[], fileName: string) => {
      setState((s) => ({
        ...s,
        payments,
        paymentFileName: fileName,
        checkins: [],
        checkinFileName: null,
      }));
    },
    [],
  );

  const setCheckins = useCallback(
    (checkins: ParsedCheckin[], fileName: string) => {
      setState((s) => ({ ...s, checkins, checkinFileName: fileName }));
    },
    [],
  );

  const resetMembers = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const resetPayments = useCallback(() => {
    setState((s) => ({
      ...s,
      payments: [],
      paymentFileName: null,
      checkins: [],
      checkinFileName: null,
    }));
  }, []);

  const resetCheckins = useCallback(() => {
    setState((s) => ({ ...s, checkins: [], checkinFileName: null }));
  }, []);

  const handleCommit = useCallback(async () => {
    setCommitting(true);
    try {
      const token = await getToken();
      const selectedMembers = state.members.filter(
        (m) => !state.excludedEmails.has(m.email),
      );
      const selectedEmails = new Set(selectedMembers.map((m) => m.email));
      const filteredPayments = state.payments.filter((p) =>
        selectedEmails.has(p.member_email),
      );
      const filteredCheckins = state.checkins.filter((c) =>
        selectedEmails.has(c.member_email),
      );

      const payload: CommitRequest = {
        members: selectedMembers,
        payments: filteredPayments,
        checkins: filteredCheckins,
      };

      const result = await api.post<CommitResponse>(
        "/import/wizard/commit",
        payload,
        token ?? undefined,
      );
      setCommitResult(result);
      onComplete?.(result);
    } finally {
      setCommitting(false);
    }
  }, [getToken, state, onComplete]);

  if (commitResult) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Importacao concluida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-2xl font-bold">
                  {commitResult.members.inserted + commitResult.members.updated}
                </p>
                <p className="text-xs text-muted-foreground">Alunos</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-2xl font-bold">
                  {commitResult.payments.inserted}
                </p>
                <p className="text-xs text-muted-foreground">Pagamentos</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-2xl font-bold">
                  {commitResult.checkins.inserted}
                </p>
                <p className="text-xs text-muted-foreground">Check-ins</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <StepIndicator current={step} />

      {step === 1 && (
        <StepMembers
          members={state.members}
          excludedEmails={state.excludedEmails}
          fileName={state.memberFileName}
          onParsed={setMembers}
          onExcludedChange={setExcludedEmails}
          onReset={resetMembers}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <StepPayments
          payments={state.payments}
          excludedEmails={state.excludedEmails}
          fileName={state.paymentFileName}
          onParsed={setPayments}
          onReset={resetPayments}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <StepCheckins
          wizardState={state}
          fileName={state.checkinFileName}
          onParsed={setCheckins}
          onReset={resetCheckins}
          onBack={() => setStep(2)}
          onCommit={handleCommit}
          committing={committing}
        />
      )}
    </div>
  );
}
