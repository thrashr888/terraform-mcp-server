/**
 * Helper function to generate example values based on Terraform input types
 * @param input Input definition with type information
 * @returns Appropriate example value as a string
 */
export function getExampleValue(input: any): string {
  const type = input.type || "string";
  
  // Simple type handling
  if (type === "string") return "\"example-value\"";
  if (type === "number") return "123";
  if (type === "bool") return "true";
  
  // Complex types
  if (type.startsWith("map(")) return "{}";
  if (type.startsWith("list(")) return "[]";
  if (type.startsWith("set(")) return "[]";
  if (type === "any") return "null";
  
  // Default for unknown types
  return `"${input.name}-value"`;
}

/**
 * Helper function to generate resource descriptions
 * @param resourceName Full resource name
 * @param providerName Provider name
 * @returns Generated description for the resource
 */
export function getResourceDescription(resourceName: string, providerName: string): string {
  // Extract the resource type
  const resourceType = resourceName.includes("_") ? 
    resourceName.substring(resourceName.indexOf("_") + 1) : 
    resourceName;
  
  // Common resource descriptions
  const descriptions: Record<string, string> = {
    // AWS common resources
    "s3_bucket": "An S3 bucket is a container for storing objects in Amazon S3. You can use buckets to store and serve files, host static websites, or as a destination for logs.",
    "instance": "An EC2 instance is a virtual server in Amazon's Elastic Compute Cloud (EC2) for running applications on the AWS infrastructure.",
    "vpc": "A Virtual Private Cloud (VPC) is a virtual network dedicated to your AWS account that is logically isolated from other virtual networks in the AWS Cloud.",
    "subnet": "A subnet is a range of IP addresses in your VPC that can be used to isolate resources within your network.",
    "security_group": "A security group acts as a virtual firewall for your instance to control inbound and outbound traffic.",
    "iam_role": "An IAM role is an AWS Identity and Access Management entity with permissions to make AWS service requests.",
    "lambda_function": "AWS Lambda is a serverless compute service that runs your code in response to events and automatically manages the underlying compute resources.",
    
    // GCP common resources
    "compute_instance": "A Compute Engine instance is a virtual machine hosted on Google's infrastructure.",
    
    // Azure common resources
    "resource_group": "A resource group is a container that holds related resources for an Azure solution.",
    "virtual_machine": "An Azure virtual machine is an on-demand, scalable computing resource.",
  };
  
  // Check for specific resource types
  for (const [key, description] of Object.entries(descriptions)) {
    if (resourceType.includes(key)) {
      return description;
    }
  }
  
  // Default description if no specific match found
  return `A ${resourceName} resource for the ${providerName} provider. Please refer to the provider documentation for more details about this resource type.`;
}

/**
 * Helper function to generate example template based on resource type
 * @param resourceName Full resource name
 * @param resourceType Resource type (optional)
 * @param example Example code (optional)
 * @returns Example Terraform configuration
 */
export function generateTemplateExample(
  resourceName: string,
  resourceType?: string,
  example?: string
): string {
  // If we have a specific example, use it
  if (example) {
    return example;
  }

  // Extract the resource type to generate appropriate examples
  const resourceTypeToUse = resourceType || (resourceName.includes("_") ? 
    resourceName.substring(resourceName.indexOf("_") + 1) : 
    resourceName);
  
  // Common patterns for different resource types
  const commonPatterns: Record<string, string> = {
    // AWS common resources
    "s3_bucket": `resource "${resourceName}" "example" {
  bucket = "my-example-bucket-name"
  acl    = "private"
  
  tags = {
    Name        = "My Example Bucket"
    Environment = "Dev"
  }
}`,
    "instance": `resource "${resourceName}" "example" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"
  
  tags = {
    Name = "ExampleInstance"
  }
}`,
    "vpc": `resource "${resourceName}" "example" {
  cidr_block = "10.0.0.0/16"
  
  tags = {
    Name = "example-vpc"
  }
}`,
    "subnet": `resource "${resourceName}" "example" {
  vpc_id            = aws_vpc.example.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-west-2a"
  
  tags = {
    Name = "example-subnet"
  }
}`,
    "security_group": `resource "${resourceName}" "example" {
  name        = "example-security-group"
  description = "Example security group"
  vpc_id      = aws_vpc.example.id
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}`,
    "iam_role": `resource "${resourceName}" "example" {
  name = "example-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}`,
    "lambda_function": `resource "${resourceName}" "example" {
  function_name = "example-function"
  role          = aws_iam_role.example.arn
  handler       = "index.handler"
  runtime       = "nodejs14.x"
  
  filename      = "function.zip"
  
  environment {
    variables = {
      ENVIRONMENT = "dev"
    }
  }
}`,

    // GCP common resources
    "compute_instance": `resource "${resourceName}" "example" {
  name         = "example-instance"
  machine_type = "e2-medium"
  zone         = "us-central1-a"
  
  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-10"
    }
  }
  
  network_interface {
    network = "default"
    access_config {
      // Ephemeral IP
    }
  }
}`,

    // Azure common resources
    "resource_group": `resource "${resourceName}" "example" {
  name     = "example-resources"
  location = "West Europe"
  
  tags = {
    environment = "dev"
  }
}`,
    "virtual_machine": `resource "${resourceName}" "example" {
  name                  = "example-vm"
  location              = azurerm_resource_group.example.location
  resource_group_name   = azurerm_resource_group.example.name
  network_interface_ids = [azurerm_network_interface.example.id]
  vm_size               = "Standard_DS1_v2"
  
  storage_image_reference {
    publisher = "Canonical"
    offer     = "UbuntuServer"
    sku       = "18.04-LTS"
    version   = "latest"
  }
}`,
  };
  
  // Check for specific resource types first
  for (const [key, template] of Object.entries(commonPatterns)) {
    if (resourceTypeToUse.includes(key)) {
      return template;
    }
  }
  
  // Default template if no specific match found
  return `resource "${resourceName}" "example" {
  # Required arguments
  # Refer to the provider documentation for required and optional arguments
  
  # Common pattern includes tags for most resources
  tags = {
    Name        = "example-resource"
    Environment = "dev"
    Terraform   = "true"
  }
}`;
}

/**
 * Helper function to extract example usage from documentation content
 * @param content Documentation content 
 * @returns Extracted code example or null
 */
export function extractUsageFromApiContent(content: string): string | null {
  const exampleMatch = content.match(/```(?:hcl|terraform)([\s\S]*?)```/);
  if (exampleMatch) {
    return exampleMatch[1].trim();
  }
  return null;
}