import { newEnforcer, Enforcer } from "casbin";
import path from "path";

let enforcer: Enforcer | null = null;

export async function getEnforcer(): Promise<Enforcer> {
  if (enforcer) return enforcer;

  const modelPath = path.join(process.cwd(), "pmodel.conf");

  enforcer = await newEnforcer(modelPath);

  await loadPolicies(enforcer);

  return enforcer;
}

async function loadPolicies(e: Enforcer) {
  const policies: [string, string, string][] = [
    ["ADMIN", "*", "*"],
    ["TEACHER", "grade", "create"],
    ["TEACHER", "grade", "read"],
    ["TEACHER", "absence", "create"],
    ["TEACHER", "absence", "read"],
    ["TEACHER", "absence", "delete"],
    ["TEACHER", "observation", "create"],
    ["TEACHER", "observation", "read"],
    ["TEACHER", "student", "read"],
    ["TEACHER", "report", "read"],
    ["TEACHER", "document", "create"],
    ["TEACHER", "document", "read"],
    ["HOMEROOM", "excuse", "create"],
    ["HOMEROOM", "excuse", "approve"],
    ["HOMEROOM", "grade", "read"],
    ["HOMEROOM", "absence", "read"],
    ["HOMEROOM", "absence", "delete"],
    ["HOMEROOM", "observation", "create"],
    ["HOMEROOM", "observation", "read"],
    ["HOMEROOM", "student", "read"],
    ["HOMEROOM", "announcement", "create"],
    ["HOMEROOM", "announcement", "read"],
    ["HOMEROOM", "report", "read"],
    ["HOMEROOM", "document", "create"],
    ["HOMEROOM", "document", "read"],
    ["PARENT", "grade", "read"],
    ["PARENT", "absence", "read"],
    ["PARENT", "observation", "read"],
    ["PARENT", "document", "read"],
    ["PARENT", "announcement", "read"],
    ["SECRETARY", "student", "*"],
    ["SECRETARY", "enrollment", "*"],
    ["SECRETARY", "class", "*"],
    ["SECRETARY", "subject", "*"],
    ["SECRETARY", "user", "*"],
    ["SECRETARY", "report", "*"],
    ["SECRETARY", "document", "*"],
    ["SECRETARY", "announcement", "read"],
  ];

  for (const [sub, obj, act] of policies) {
    await e.addPolicy(sub, obj, act);
  }
}

export async function can(
  roles: string[],
  resource: string,
  action: string
): Promise<boolean> {
  const e = await getEnforcer();
  for (const role of roles) {
    if (await e.enforce(role, resource, action)) return true;
  }
  return false;
}
