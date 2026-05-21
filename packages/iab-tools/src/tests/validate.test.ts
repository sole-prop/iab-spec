import { describe, it, expect } from 'vitest';
import { validateBlueprintContent } from '../validate';

describe('IaO Blueprint Validation Suite', () => {
  const validBlueprintYaml = `
version: "1.0"
organization:
  name: "Sunrise Education Group"
  type: "education"
  size: "50-200"
people:
  - id: director-sharma
    name: "Prof. A.K. Sharma"
    role: "Director"
  - id: principal-singh
    name: "Dr. R.K. Singh"
    role: "Principal"
agents:
  - id: admissions-agent
    role: "AI Admissions Coordinator"
    owns: [admissions-workflow]
workflows:
  - id: admissions-workflow
    name: "Student Admissions Pipeline"
    steps:
      - id: receive_application
        name: "Receive Application"
        owner: admissions-agent
        avg_duration_hours: 0.5
      - id: principal_review
        name: "Principal Approval"
        owner: principal-singh
        avg_duration_hours: 51
        threshold_hours: 24
goals:
  - id: enrollment-goal
    title: "500 Students Enrolled"
    owner: director-sharma
`;

  it('Test 1: should pass validation for a perfectly valid blueprint', () => {
    const result = validateBlueprintContent(validBlueprintYaml);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.counts.agents).toBe(1);
    expect(result.counts.workflows).toBe(1);
  });

  it('Test 2: should fail validation if required fields are missing', () => {
    const invalidYaml = `
version: "1.0"
organization:
  type: "education"
`;
    const result = validateBlueprintContent(invalidYaml);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('should have required property') || e.includes('required'))).toBe(true);
  });

  it('Test 3: should warn about broken cross-references (agent owns non-existent workflow)', () => {
    const brokenRefYaml = `
version: "1.0"
organization:
  name: "Sunrise Education Group"
agents:
  - id: admissions-agent
    role: "AI Admissions Coordinator"
    owns: [non-existent-workflow]
`;
    const result = validateBlueprintContent(brokenRefYaml);
    expect(result.valid).toBe(true);
    expect(result.warnings.some(w => w.includes('owns non-existent workflow'))).toBe(true);
  });

  it('Test 4: should detect duration bottlenecks exceeding threshold SLAs', () => {
    const result = validateBlueprintContent(validBlueprintYaml);
    expect(result.valid).toBe(true);
    expect(result.bottlenecks.length).toBe(1);
    expect(result.bottlenecks[0]).toContain('exceeds SLA threshold');
  });

  it('Test 5: should fail validation on broken YAML syntax', () => {
    const brokenYaml = `
version: "1.0
organization:
  name: : : Sunrise
`;
    const result = validateBlueprintContent(brokenYaml);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('YAML Parsing Error');
  });

  it('Test 6: should fail on empty or invalid non-object structure', () => {
    const result = validateBlueprintContent('');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('empty or invalid');
  });
});
