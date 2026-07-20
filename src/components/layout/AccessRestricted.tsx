import { Shield } from "lucide-react";

import { Card } from "@/components/ui/card";

export default function AccessRestricted({ message }: { message: string }) {
  return (
    <Card className="p-8 text-center">
      <Shield className="mx-auto text-muted-foreground" size={40} />
      <h1 className="mt-3 text-lg font-semibold text-foreground">Access restricted</h1>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </Card>
  );
}
