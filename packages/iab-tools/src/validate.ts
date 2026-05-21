#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import chalk from 'chalk';

// AJV Initialization
const ajv = new Ajv({ allErrors: true });

// Minimal fallback schema in case file-based load fails
const fallbackSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "IaO Blueprint Fallback Schema",
  "type": "object",
  "required": ["version", "organization"],
  "properties": {
    "version": { "type": "string" },
    "organization": {
      "type": "object",
      "required": ["name"],
      "properties": {
        "name": { "type": "string" }
      }
    }
  }
};

export interface Step {
  id: string;
  name: string;
  owner?: string;
  channel?: string;
  avg_duration_hours?: number;
  threshold_hours?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  owner?: string;
  steps?: Step[];
  blocks?: { id: string; reason: string }[];
  contributes_to?: { id: string; weight: number }[];
}

export interface Agent {
  id: string;
  role: string;
  name?: string;
  owns?: string[];
  reports_to?: string;
}

export interface Person {
  id: string;
  name: string;
  role?: string;
  owns?: string[];
  reports_to?: string;
}

export interface Goal {
  id: string;
  title: string;
  owner?: string;
}

export interface Blueprint {
  version: string;
  organization: {
    name: string;
    type?: string;
    size?: string;
  };
  agents?: Agent[];
  people?: Person[];
  workflows?: Workflow[];
  goals?: Goal[];
}

export function validateBlueprintContent(content: string, schemaPath?: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  bottlenecks: string[];
  counts: { agents: number; workflows: number; goals: number; people: number };
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const bottlenecks: string[] = [];
  const counts = { agents: 0, workflows: 0, goals: 0, people: 0 };

  let doc: any;
  try {
    doc = yaml.load(content);
  } catch (e: any) {
    return {
      valid: false,
      errors: [`YAML Parsing Error: ${e.message}`],
      warnings,
      bottlenecks,
      counts
    };
  }

  if (!doc || typeof doc !== 'object') {
    return {
      valid: false,
      errors: ['Blueprint file is empty or invalid.'],
      warnings,
      bottlenecks,
      counts
    };
  }

  // Schema Validation
  let schema = fallbackSchema;
  if (schemaPath) {
    try {
      schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    } catch (e) {
      // Fallback stays
    }
  }

  const validate = ajv.compile(schema);
  const isValid = validate(doc);

  if (!isValid && validate.errors) {
    validate.errors.forEach((err) => {
      errors.push(`[Schema] ${err.dataPath} ${err.message} (${JSON.stringify(err.params)})`);
    });
    return {
      valid: false,
      errors,
      warnings,
      bottlenecks,
      counts
    };
  }

  const blueprint = doc as Blueprint;
  
  // Extract collections and resolve IDs
  const agents = blueprint.agents || [];
  const people = blueprint.people || [];
  const workflows = blueprint.workflows || [];
  const goals = blueprint.goals || [];

  counts.agents = agents.length;
  counts.people = people.length;
  counts.workflows = workflows.length;
  counts.goals = goals.length;

  const agentIds = new Set(agents.map(a => a.id));
  const peopleIds = new Set(people.map(p => p.id));
  const workflowIds = new Set(workflows.map(w => w.id));
  const goalIds = new Set(goals.map(g => g.id));
  const validEntityIds = new Set([...agentIds, ...peopleIds]);

  // CROSS-REF CHECKS (all 6)

  // 1. Agent owns[] -> must exist in workflows[].id
  agents.forEach(agent => {
    if (agent.owns) {
      agent.owns.forEach(wId => {
        if (!workflowIds.has(wId)) {
          warnings.push(`[Cross-Ref] Agent "${agent.id}" owns non-existent workflow "${wId}"`);
        }
      });
    }
  });

  // 2. Agent reports_to -> must exist in people[].id OR agents[].id
  agents.forEach(agent => {
    if (agent.reports_to && !validEntityIds.has(agent.reports_to)) {
      warnings.push(`[Cross-Ref] Agent "${agent.id}" reports to non-existent entity "${agent.reports_to}"`);
    }
  });

  // 3. Workflow blocks[].id -> must exist in workflows[].id
  workflows.forEach(wf => {
    if (wf.blocks) {
      wf.blocks.forEach(block => {
        if (!workflowIds.has(block.id)) {
          warnings.push(`[Cross-Ref] Workflow "${wf.id}" blocks non-existent workflow "${block.id}"`);
        }
      });
    }
  });

  // 4. Workflow contributes_to[].id -> must exist in goals[].id
  workflows.forEach(wf => {
    if (wf.contributes_to) {
      wf.contributes_to.forEach(contrib => {
        if (!goalIds.has(contrib.id)) {
          warnings.push(`[Cross-Ref] Workflow "${wf.id}" contributes to non-existent goal "${contrib.id}"`);
        }
      });
    }
  });

  // 5. Workflow steps[].owner -> must exist in people[].id OR agents[].id
  workflows.forEach(wf => {
    if (wf.steps) {
      wf.steps.forEach(step => {
        if (step.owner && !validEntityIds.has(step.owner)) {
          warnings.push(`[Cross-Ref] Workflow "${wf.id}", step "${step.id}" has non-existent owner "${step.owner}"`);
        }
        // Bottleneck detection
        if (step.avg_duration_hours !== undefined && step.threshold_hours !== undefined) {
          if (step.avg_duration_hours > step.threshold_hours) {
            bottlenecks.push(`Workflow "${wf.id}", step "${step.id}" (${step.avg_duration_hours}h avg) exceeds SLA threshold (${step.threshold_hours}h)`);
          }
        }
      });
    }
  });

  // 6. Goal owner -> must exist in people[].id OR agents[].id
  goals.forEach(goal => {
    if (goal.owner && !validEntityIds.has(goal.owner)) {
      warnings.push(`[Cross-Ref] Goal "${goal.id}" is owned by non-existent entity "${goal.owner}"`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    bottlenecks,
    counts
  };
}

// CLI Execution Wrapper
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(chalk.cyan('Usage: iab-validate <path-to-org.iab.yml>'));
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), args[0]);
  if (!fs.existsSync(filePath)) {
    console.error(chalk.red(`✗ Error: File not found at "${filePath}"`));
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Attempt resolving relative schema file
  const localSchemaPath = path.resolve(__dirname, '../../../schema/org.iab.schema.json');
  
  const result = validateBlueprintContent(content, fs.existsSync(localSchemaPath) ? localSchemaPath : undefined);

  if (!result.valid) {
    console.error(chalk.red('\n✗ Validation failed: schema errors detected'));
    result.errors.forEach(err => console.error(chalk.red(`  - ${err}`)));
    process.exit(1);
  }

  console.log(chalk.green(`\n✓ org.iab.yml is a valid IaO Blueprint`));
  console.log(chalk.green(`✓ ${result.counts.agents} agents, ${result.counts.workflows} workflows, ${result.counts.goals} goals, ${result.counts.people} people defined.`));

  if (result.warnings.length > 0) {
    console.warn(chalk.yellow(`\n⚠ Cross-Reference Warnings:`));
    result.warnings.forEach(warn => console.warn(chalk.yellow(`  ${warn}`)));
  }

  if (result.bottlenecks.length > 0) {
    console.warn(chalk.red(`\n⚠ Bottlenecks Detected:`));
    result.bottlenecks.forEach(bot => console.warn(chalk.red(`  ${bot}`)));
  }

  process.exit(0);
}
