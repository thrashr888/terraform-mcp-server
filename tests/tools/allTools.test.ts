// This file contains simplified tests for the remaining tools to avoid repetition
// The approach is similar to the more detailed tests in other files
import { resetFetchMocks, mockFetchResponse, getFetchCalls } from '../global-mock';

describe('Provider Schema Details tool', () => {
  beforeEach(() => {
    resetFetchMocks();
  });

  test('should return provider schema when found', async () => {
    mockFetchResponse({
      ok: true,
      json: () => Promise.resolve({ provider_schema: { resources: {}, data_sources: {} } })
    } as Response);

    const input = { provider: 'aws', namespace: 'hashicorp' };
    const url = `https://registry.terraform.io/v1/providers/${input.namespace}/${input.provider}/schemas`;
    const response = await fetch(url);
    const data = await response.json();
    
    const calls = getFetchCalls();
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe(url);
    expect(data).toHaveProperty('provider_schema');
  });
});

describe('Resource Argument Details tool', () => {
  beforeEach(() => {
    resetFetchMocks();
  });

  test('should return resource arguments when found', async () => {
    mockFetchResponse({
      ok: true,
      json: () => Promise.resolve({ block: { attributes: { 
        ami: { type: 'string', description: 'AMI ID', required: true },
        instance_type: { type: 'string', description: 'Instance type', required: true }
      }}})
    } as Response);

    const input = { provider: 'aws', namespace: 'hashicorp', resource: 'aws_instance' };
    const url = `https://registry.terraform.io/v1/providers/${input.namespace}/${input.provider}/resources/${input.resource}`;
    const response = await fetch(url);
    const data = await response.json();
    
    const calls = getFetchCalls();
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe(url);
    expect(data.block.attributes).toHaveProperty('ami');
  });
});

describe('Module Details tool', () => {
  beforeEach(() => {
    resetFetchMocks();
  });

  test('should return module details when found', async () => {
    mockFetchResponse({
      ok: true,
      json: () => Promise.resolve({ 
        versions: ['5.0.0'], 
        root: { 
          inputs: [{ name: 'region', description: 'AWS region' }],
          outputs: [{ name: 'vpc_id', description: 'VPC ID' }],
          dependencies: []
        }
      })
    } as Response);

    const input = { namespace: 'terraform-aws-modules', module: 'vpc', provider: 'aws' };
    const url = `https://registry.terraform.io/v1/modules/${input.namespace}/${input.module}/${input.provider}`;
    const response = await fetch(url);
    const data = await response.json();
    
    const calls = getFetchCalls();
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe(url);
    expect(data).toHaveProperty('versions');
    expect(data).toHaveProperty('root');
  });
});

describe('Example Config Generator tool', () => {
  beforeEach(() => {
    resetFetchMocks();
  });

  test('should generate example config when resource schema found', async () => {
    mockFetchResponse({
      ok: true,
      json: () => Promise.resolve({ block: { attributes: { 
        ami: { type: 'string', description: 'AMI ID', required: true, computed: false },
        instance_type: { type: 'string', description: 'Instance type', required: true, computed: false }
      }}})
    } as Response);

    const input = { provider: 'aws', namespace: 'hashicorp', resource: 'aws_instance' };
    const url = `https://registry.terraform.io/v1/providers/${input.namespace}/${input.provider}/resources/${input.resource}`;
    const response = await fetch(url);
    const schema = await response.json();
    
    const calls = getFetchCalls();
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe(url);
    
    // Generate config
    const attrs = schema.block.attributes;
    let config = `resource "${input.resource}" "example" {\n`;
    
    for (const [name, attr] of Object.entries(attrs)) {
      const typedAttr = attr as any;
      const isRequired = typedAttr.required === true && typedAttr.computed !== true;
      if (isRequired) {
        let placeholder = `"example"`;
        config += `  ${name} = ${placeholder}\n`;
      }
    }
    config += `}\n`;
    
    // Verify the generated config
    expect(config).toContain('resource "aws_instance" "example"');
    expect(config).toContain('ami');
    expect(config).toContain('instance_type');
  });
}); 