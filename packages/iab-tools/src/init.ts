#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import yaml from 'js-yaml';
import { validateBlueprintContent } from './validate';

async function main() {
  const args = process.argv.slice(2);
  let templateArg: string | undefined;
  let orgNameArg: string | undefined;
  let outputPathArg = 'org.iab.yml';

  // Basic argument parsing
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--template' && i + 1 < args.length) {
      templateArg = args[i + 1];
      i++;
    } else if (args[i] === '--org' && i + 1 < args.length) {
      orgNameArg = args[i + 1];
      i++;
    } else if (args[i] === '--output' && i + 1 < args.length) {
      outputPathArg = args[i + 1];
      i++;
    }
  }

  const resolveExamplePath = (tpl: string) =>
    path.resolve(__dirname, `../../../examples/${tpl}.iab.yml`);

  // 1. Template Copy Scaffolding Mode
  if (templateArg) {
    const validTemplates = ['startup', 'education', 'ngo', 'agency'];
    if (!validTemplates.includes(templateArg)) {
      console.error(chalk.red(`✗ Error: Invalid template specified. Choose from: ${validTemplates.join(', ')}`));
      process.exit(1);
    }

    const tplPath = resolveExamplePath(templateArg);
    if (!fs.existsSync(tplPath)) {
      console.error(chalk.red(`✗ Error: Template file not found at "${tplPath}"`));
      process.exit(1);
    }

    let rawContent = fs.readFileSync(tplPath, 'utf8');

    // Replace org name if custom name provided
    if (orgNameArg) {
      try {
        const doc = yaml.load(rawContent) as any;
        if (doc && doc.organization) {
          doc.organization.name = orgNameArg;
          rawContent = yaml.dump(doc);
        }
      } catch (err) {
        // Fallback to text replace if parse fails
        rawContent = rawContent.replace(/name:\s*".*"/, `name: "${orgNameArg}"`);
      }
    }

    // Write file
    const absoluteOut = path.resolve(process.cwd(), outputPathArg);
    fs.writeFileSync(absoluteOut, rawContent, 'utf8');

    console.log(chalk.green(`\n✓ Blueprint successfully created from template "${templateArg}" at "${absoluteOut}"`));
    console.log(chalk.cyan(`  Validate anytime with: iab-validate ${outputPathArg}`));
    console.log(chalk.cyan(`  Load into Sovereign Core with: sovereign load ${outputPathArg}\n`));
    process.exit(0);
  }

  // 2. Fully Interactive Wizard Mode (exact Q1 - Q8 questions)
  console.log(chalk.cyan('\n=== IaO Blueprint Initializer ===\n'));

  const questions = [
    {
      type: 'input',
      name: 'orgName',
      message: 'Organization name?',
      validate: (input: string) => (input.trim() ? true : 'Organization name is required.')
    },
    {
      type: 'list',
      name: 'orgType',
      message: 'Organization type?',
      choices: ['startup', 'smb', 'education', 'ngo', 'agency']
    },
    {
      type: 'list',
      name: 'orgSize',
      message: 'Organization size?',
      choices: ['1-10', '10-50', '50-200', '200-1000', '1000+']
    },
    {
      type: 'list',
      name: 'language',
      message: 'Primary language?',
      choices: [
        { name: 'English (en)', value: 'en' },
        { name: 'Hindi (hi)', value: 'hi' },
        { name: 'Other', value: 'other' }
      ]
    },
    {
      type: 'number',
      name: 'agentCount',
      message: 'How many AI agents to define?',
      default: 1
    },
    {
      type: 'number',
      name: 'workflowCount',
      message: 'How many workflows?',
      default: 1
    },
    {
      type: 'input',
      name: 'goalTitle',
      message: 'Primary goal title?',
      validate: (input: string) => (input.trim() ? true : 'Goal title is required.')
    },
    {
      type: 'input',
      name: 'goalMetric',
      message: 'Goal metric?'
    },
    {
      type: 'number',
      name: 'goalTarget',
      message: 'Goal target value?'
    },
    {
      type: 'input',
      name: 'goalDeadline',
      message: 'Goal deadline? (YYYY-MM-DD)'
    },
    {
      type: 'checkbox',
      name: 'integrations',
      message: 'Integrations?',
      choices: ['whatsapp', 'excel', 'notion', 'slack', 'git', 'none']
    }
  ];

  const answers = await inquirer.prompt(questions);

  const agentsList: any[] = [];
  const workflowsList: any[] = [];

  // Q5 loops - Agent roles and frameworks
  for (let i = 0; i < answers.agentCount; i++) {
    console.log(chalk.cyan(`\n--- Configure Agent ${i + 1} ---`));
    const agentAns = await inquirer.prompt([
      {
        type: 'input',
        name: 'role',
        message: `Agent ${i + 1} role?`,
        validate: (input: string) => (input.trim() ? true : 'Agent role is required.')
      },
      {
        type: 'list',
        name: 'framework',
        message: `Agent ${i + 1} framework?`,
        choices: ['sovereign', 'langraph', 'crewai', 'antigravity', 'openai', 'custom']
      }
    ]);
    const id = agentAns.role.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    agentsList.push({
      id,
      role: agentAns.role,
      framework: agentAns.framework,
      status: 'active',
      memory_scope: 'team'
    });
  }

  // Q6 loops - Workflow name and steps
  for (let i = 0; i < answers.workflowCount; i++) {
    console.log(chalk.cyan(`\n--- Configure Workflow ${i + 1} ---`));
    const wfAns = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: `Workflow ${i + 1} name?`,
        validate: (input: string) => (input.trim() ? true : 'Workflow name is required.')
      },
      {
        type: 'input',
        name: 'steps',
        message: `Workflow ${i + 1} steps? (comma-separated)`
      }
    ]);

    const id = wfAns.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const parsedSteps = wfAns.steps
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0)
      .map((s: string, sIdx: number) => ({
        id: s.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: s
      }));

    workflowsList.push({
      id,
      name: wfAns.name,
      state: 'active',
      steps: parsedSteps
    });
  }

  // Integrations assembly
  const integrationsList = answers.integrations
    .filter((it: string) => it !== 'none')
    .map((it: string) => ({
      id: `${it}-connector`,
      type: it,
      description: `Default ${it} connector hook`
    }));

  const generatedBlueprint: any = {
    version: '1.0',
    organization: {
      name: answers.orgName,
      type: answers.orgType,
      size: answers.orgSize,
      primary_language: answers.language,
      compiled_at: new Date().toISOString(),
      confidence_score: 1.0,
      iab_source: 'manual'
    },
    agents: agentsList.length > 0 ? agentsList : undefined,
    workflows: workflowsList.length > 0 ? workflowsList : undefined,
    goals: [
      {
        id: 'primary-goal',
        title: answers.goalTitle,
        metric: answers.goalMetric || undefined,
        target_value: answers.goalTarget || undefined,
        deadline: answers.goalDeadline || undefined,
        health: 'on_track'
      }
    ],
    integrations: integrationsList.length > 0 ? integrationsList : undefined
  };

  const outputContent = yaml.dump(generatedBlueprint);

  // Validate the generated content
  const localSchemaPath = path.resolve(__dirname, '../../../schema/org.iab.schema.json');
  const result = validateBlueprintContent(
    outputContent,
    fs.existsSync(localSchemaPath) ? localSchemaPath : undefined
  );

  const absoluteOut = path.resolve(process.cwd(), outputPathArg);
  fs.writeFileSync(absoluteOut, outputContent, 'utf8');

  console.log(chalk.green(`\n✓ Blueprint successfully created at "${absoluteOut}"`));
  console.log(chalk.cyan(`  Validate anytime with: iab-validate ${outputPathArg}`));
  console.log(chalk.cyan(`  Load into Sovereign Core with: sovereign load ${outputPathArg}\n`));

  if (!result.valid) {
    console.warn(chalk.yellow('⚠ Warning: The generated blueprint failed schema checks. Errors:'));
    result.errors.forEach(err => console.warn(chalk.yellow(`  - ${err}`)));
  }
}

main().catch(err => {
  console.error(chalk.red(`✗ Error executing wizard: ${err.message}`));
  process.exit(1);
});
