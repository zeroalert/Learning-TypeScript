- Pulumi revolutionizes Infrastructure as Code (IaC) by allowing you to define cloud infrastructure using familiar program languages. 
- In the context of Pulumi, infrastructure definitions remain declarative. You describe the desired end state of your infrastructure and pulumi's engine determines the necessary action to achieve that stage
### Declarative vs. Imperative IaC Revisited with Pulumi

- Declarative IaC(Traditional) You describe wghat the infrastructure should look like, often in a static configuration file. The tool then figures out how to get there 

**Example (Hypothetical JSON):**

```
{
  "resource_group": {
    "name": "my-rg",
    "location": "East US"
  }
}
```
 This simply states that a resource group named "my-rg" should exist in "East US". The tool (e.g., a hypothetical JSON IaC parser) handles the API calls.

- Declarative IaC (Pulumi with a real language): You still describe what the infrastructure should look like, but you do so using the constructs of a programming language. The programming language itself enables you to express this desired state with greater expressiveness and logic. 
**Example (TypeScript):**

``` TypeScript

import * as azure from "@pulumi/azure-native";

const resourceGroup = new azure.resources.ResourceGroup("my-resource-group", {
    resourceGroupName: "my-rg-pulumi",
    location: "EastUS",
});
```

Here, `new azure.resources.ResourceGroup(...)` is a declarative statement. It tells Pulumi: "I want a resource group with this name and location." The TypeScript code is not instructing Pulumi _how_ to make the API call step-by-step; rather, it's declaring the desired resource. The programming language allows us to easily add conditional logic, loops, or functions around this declaration, which would be cumbersome in raw JSON/YAML.
### Leveraging the Power of Programming Languages

- Traditional IaC (e.g, Terraform Modules, CloudFormation Templates): While these tools offer module systems for reusability, they are often constrained by the DSL's capabilities. Creating highly generic or deeply nested abstractions can become cumbersome. 
- Pulumi you can encapsulate common infrastructure patterns into reusable functions, classes, or even Pulumi Components within your chosen programming language. This allows for complex, type-safe abstractions that are easily shared and maintained across projects. 
- Logical and Conditional
	- Traditional IAC: implementing conditional logic ( e.g., deploying a resource only if a certain environment variable is set) often requires intricate templating engines.
	- Pulumi you use native 'if/else' statements, 'switch' cases, and ternary operators directly within your infrastructure code. 
- Type Safety and static Analysis
	- Traditional IaC errors often surface only during the deployment when the configuration is parsed. Lacking strong typing, it's easy to make types in resource names, properties , or values that are only caught at runtime. 
	- Pulumi with Typescript provide static type checking, catching errors before deployment. This signficantly reduces debugging time and increases confidence in your infrastructure code. The Pulumi SDKs (e.g., `@pulumi/azure-native`) provide rich type definitions for all cloud resources and their properties.
		- - **Real-world example:** When defining an Azure Storage Account, TypeScript will autocomplete valid properties and immediately flag an error if you try to assign an invalid string to a property expecting a numerical value, or if you misspell a property name. This prevents deployment failures due to simple syntax errors.
- **Hypothetical scenario:** A junior developer is tasked with provisioning an Azure Kubernetes Service (AKS) cluster. Without type safety, they might accidentally set an invalid Kubernetes version string or misconfigure a network profile property. With TypeScript and Pulumi, the IDE would immediately highlight these issues, guiding them to correct and valid configurations based on the Azure API's specifications.

## Key Concepts of Pulumi's Approach

- Pulumi Programs
	-  A pulumi program can support set of files such as index.ts for tyepscript, when you run pulumi up you'll notice that your type of file will be accepted. 
- Resource Model
	- Pulumi represents every cloud resource (e.g, an Azure Resource Group, a Storage Account) as an object in your chosen programming language. Utilizing the cloud providers API 
		- **Creating a Resource:** When you instantiate a new resource object in your Pulumi program (e.g., `new azure.resources.ResourceGroup(...)`), you are declaring that you want this resource to exist in the cloud. Pulumi manages the lifecycle of this declared resource.

```typescript
	- import * as azure from "@pulumi/azure-native"; // Import the Azure Native provider

// Create an Azure Resource Group
// The first argument "my-rg-unique-name" is the logical name for the resource within Pulumi.
// This name is used by Pulumi to track the resource in its state file.
// The second argument is an object containing the actual properties for the Azure Resource Group API.
const resourceGroup = new azure.resources.ResourceGroup("my-app-resource-group", {
    // The resourceGroupName property specifies the actual name of the resource group in Azure.
    // It's a best practice to make this dynamic or descriptive.
    resourceGroupName: "my-pulumi-app-rg",
    // The location property specifies the Azure region where the resource group will be created.
    location: "EastUS",
    // Tags are optional key-value pairs for organizing and managing resources in Azure.
    tags: {
        environment: "development",
        project: "pulumi-intro",
    },
});

// To use the name of the resource group in another resource,
// you would access its 'name' output property.
// This demonstrates how outputs from one resource can be used as inputs for another.
export const resourceGroupName = resourceGroup.name;
```
- **Inputs and Outputs:** When you create a resource, you provide _inputs_ (e.g., `resourceGroupName`, `location`). After Pulumi provisions the resource, it will have _outputs_ (e.g., the actual ID generated by Azure, the full name, connection strings). These outputs are often _asynchronous_ and only known after the resource has been deployed. Pulumi handles this asynchronous nature elegantly, allowing you to compose resources where one resource's output becomes another's input.
```typescript

import * as azure from "@pulumi/azure-native";

const resourceGroup = new azure.resources.ResourceGroup("my-app-resource-group", {
    resourceGroupName: "my-pulumi-app-rg",
    location: "EastUS",
});

// Create an Azure Storage Account within the resource group.
// Notice how `resourceGroup.name` (an Output<string>) is directly used as input for `resourceGroupName`.
// Pulumi intelligently waits for the resource group name to be resolved before provisioning the storage account.
const storageAccount = new azure.storage.StorageAccount("my-storage-account", {
    accountName: "mypulumistorageacct12345", // Must be globally unique, 3-24 chars, lowercase letters/numbers
    resourceGroupName: resourceGroup.name, // Use the output from the resource group
    location: resourceGroup.location,     // Use the output location from the resource group
    sku: {
        name: "Standard_LRS", // Standard Locally Redundant Storage
    },
    kind: "StorageV2", // General-purpose v2 storage account
});

// Export the primary connection string of the storage account
// This output will be displayed in the Pulumi CLI after a successful deployment.
export const primaryStorageConnectionString = storageAccount.primaryConnectionString;
```

In this example, `resourceGroup.name` is an `Output<string>`. Pulumi automatically manages the dependency: the `storageAccount` will only be created after the `resourceGroup` has been successfully provisioned and its name is known.

### Pulumi Providers

Pulumi interacts with cloud providers (like Azure, AWS, GCP) through providers, A provider is essentially a plugin that understand how to communicate with a specific cloud's API. Pulumi offers two main types of providers for Azure:

1. **Azure Native (`@pulumi/azure-native`):** This provider is automatically generated directly from the Azure Resource Manager (ARM) REST API specifications. It offers immediate access to the latest Azure resources and properties as soon as they are available in the ARM API. This means new Azure services or features are often supported in `azure-native` almost immediately without waiting for a separate Pulumi provider release cycle.
    
    - **Advantage:** Full and immediate coverage of Azure services, directly mirroring the ARM API.
    - **Disadvantage:** Can sometimes be more verbose as it strictly adheres to ARM API structure.
2. **Azure Classic (`@pulumi/azure`):** This provider leverages the older Terraform Azure provider codebase. It has a slightly more "opinionated" resource model, sometimes simplifying properties or grouping resources differently than the raw ARM API. It's well-tested and widely used but might lag slightly in supporting the newest Azure features compared to `azure-native`.
    
    - **Advantage:** Often simpler resource definitions for common scenarios, long-standing community usage.
    - **Disadvantage:** Slower to adopt the very latest Azure features, may not expose every ARM API property.

Throughout this course, we will primarily focus on the **Azure Native** provider (`@pulumi/azure-native`) to ensure we are working with the most current Azure services and API definitions directly.

## Exercises

- Conditional Resource Creation:
	- Write a Pulumi program in TypeScript that conditionally creates an Azure Storage Account.
	- Define a local variable `is ProdENvironment: boolean = false:'
	- If 'isProdEnvironment' is 'true', create an Azure Storage Account with `Standard_GRS` (Geo-Redundant Storage).
	- If `isProdEnvironment` is `false`, create the storage account with `Standard_LRS`
	- Ensure the storage account name is unique(e.g., `mystorageaccountdev123` or `mystorageaccountprod456`).
	- Use the `@pulumi/azure-native` provider

```typescript

import * azure from "@pulumi/azure-native"

const isProdEnvironment: boolean = false; // Change to true to test the prod configuration

const resourceGroup = new azure.resource.ResourceGroup("my-conditional-rg",{
	  resourceGroupName: "conditional-storage-rg",
	  location: "EastUS",
if (isProdEnvironment) {
	new azure.storage.StorageAccount("myprodstorageaccount",{
		accountName: "myprodstorage12345", // Replace with a unique name 
		resourceGroupName: resourceGroup.name,
		location: resourceGroup.location,
		sku: {
			name: "Standard_GRS", // Geo-Redundant Storage for production 
		}
		kind: "StorageV2"	
	});
	console.log("Production storage account configured.");
} else {
	new azure.storage.StorageAccount("mydevstorageaccount",{
		accountName: "mydevstorage67890", // Replace with a unique name
		resourceGroupName: resourceGroup.name,
		location: resourceGroup.location,
		sku: {
			name: "Standard_LRS", // Locally Redundant Storage for development
		}
		kind: "StorageV2",
	});
	console.log("Development storage account configured.")
};
```

**Resource Referencing and Outputs:**

- Modify your programs to create an Azure Virtual Network (VNet) and a single Subnet within it. 
- Export the VNet's name and the Subnet's ID as Pulumi outputs. 
- Ensure the Subnet correctly references the VNet's name for its creation.
- Hint: You will need `azure.network.VirtualNetwork` and `azure.network.Subnet`

``` typescript

import * as azure from "@oulumi/azure-native";

const resourceGroup = new azure.resources.ResourceGroup("my-network-rg",{
	resourceGroupName: "network-example-rg",
	location: "WestUS"
});

// Create an Azure Virtual Network 
const virtualNetwork = new azure.network.VirtualNetwork("my-vnet", {
	virtualNetworkName: "my-pulumi-vnet"
	resourceGroup: resourceGroup.name,
	location: resourceGroup.location,
	addressSpace: {
		addressPrefixes: ["10.0.0.0/16"], // Define the address space for the VNet
	},

}),

// Create a Subnet within the Virtual Network
const subnet = new azure.network.Subnet("my-subnet",{
	subnetName: "app-subnet",
	virtualNetworkName: virtualNetwork.name, // Reference the VNet's name output 
	addressPrefix: "10.0.1.0/24", // Define the address prefix for the subnet 
});

// Export the VNet name and Subnet ID 
export const vnetName = virtualNetwork.name;
export const subnetId = subnet.id; 

```

**Pulumi's Solution:**
- Instead of writing separate YAML files for each environment region, CloudGenius adopts Pulumi with Typescript. They create a "Stack Generator" Pulumi program:
	- Modular Components: They define a 'WebAppStack' class in Typescript that encapsulates the deployment of all core applications components(Azure App Service, Azure SQL Database, Azure Cache for Redis, Network Security Groups, etc.). This class takes parameters like `region`, `environment` (dev/staging/prod), and `skuTier` (e.g., "Basic:, "Standard", "Premium").
	- Conditional Logic: Inside the `WebAppStack` class, they use `if/else` statements. For instance, if `environment === prod`, The Azure SQL Database `skuTier` is set to "Premium" with geo-replication enabled; otherwise, it's "Basic" without replication. Similarly, for production, they might provision an Azure Application Gateway for load balancing and WAF, while developments environment might use a simpler Azure Front Door configuration. 
	- Type Safety: Typescript ensures that all parameters passed to the `WebAppStack` class and all Azure resource properties conform to the expected types, catching errors like misspelled region names or invalid SKU tiers during development, not during deployment. 
	- Reusability: To deploy a new environment, they simply instantiate the `WebAppStack`  class with different parameters: 
		- `new WebAppStack("us-east-prod,{ region: "East US", environment: "prod", skuTier: "Premium"});`
		- `new WebAppStack("europe-dev", { region: "West Europe", environment: "dev", skuTier: "Basic" });`
	- This approach allows CloudGenius to rapidly provision new, consistent, and correctly configured environments across any Azure region with high confidence, significantly reducing deployment errors and accelerating their global expansion. 