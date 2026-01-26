Pulumi stacks provide a mechanism to manage different deployments of the same Pulumi program, often corresponding to different environments like development, testing, and production. Each stack maintains its own independent state file, configuration settings, and set of deployed resources, ensuring isolation between environments while allowing the reuse of the same infrastructure code.

## Understanding Pulumi Stacks

A Pulumi stack is an isolated, independently configurable instance of a Pulumi program. When you deploy a Pulumi program, you deploy it _into a stack_. This allows you to deploy the exact same code into multiple environments, each with its own specific configuration and resource instances, without conflicts. For instance, a development stack might deploy smaller, cheaper resources, while a production stack deploys larger, highly available, and more expensive resources.

### Stack Creation and Selection

To create a new stack, you use the `pulumi stack init` command. This command initializes a new stack within your current Pulumi project directory. If you don't specify a stack name, Pulumi defaults to `dev`.

typescript

```
// Initialize a new stack named 'dev'
pulumi stack init dev

// Initialize a new stack named 'prod'
pulumi stack init prod
```

After initialization, you can select which stack you are currently working with using `pulumi stack select`. The selected stack determines where subsequent `pulumi up`, `pulumi refresh`, or `pulumi destroy` commands will operate.

typescript

```
// Select the 'dev' stack
pulumi stack select dev

// Select the 'prod' stack
pulumi stack select prod
```

If you try to run `pulumi up` without selecting an existing stack or initializing a new one, Pulumi will prompt you to do so. You can always see the currently selected stack using `pulumi stack ls`.

### Stack Configuration

Each Pulumi stack can have its own configuration values. These values are used within your Pulumi program to define resource properties or other settings that vary between environments. This was introduced in the "Using Pulumi configuration for dynamic environment settings" lesson. For example, a development stack might use a `resourcePrefix` of "dev-" while a production stack uses "prod-".

Configuration values are set using `pulumi config set`. By default, `pulumi config set` applies to the _currently selected stack_.

bash

```
# With 'dev' stack selected:
pulumi config set resourcePrefix dev-

# With 'prod' stack selected:
pulumi config set resourcePrefix prod-
```

Inside your TypeScript program, you retrieve these configuration values:

typescript

```
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const resourcePrefix = config.require("resourcePrefix"); // e.g., "dev-" or "prod-"

// This resource group name will be different for each stack
const resourceGroupName = `${resourcePrefix}my-rg`;

// ... other resource definitions using resourceGroupName
```

This allows the same TypeScript code to provision different resources (or resources with different names/properties) depending on the active stack.

### Stack State Files

Each stack maintains its own independent state file. This state file tracks the resources managed by Pulumi for that specific stack. This is crucial for isolating environments: destroying resources in a `dev` stack will not affect resources in a `prod` stack because they refer to different state files.

By default, Pulumi stores state in the Pulumi Service backend. However, as discussed in "Understanding Pulumi's state backend options", you can configure other backends like Azure Blob Storage. Regardless of the backend, each stack will have its unique state managed separately.

## Practical Examples of Multi-Environment Deployments

Consider a common scenario where you need to deploy a web application to three environments: development, testing, and production.

### Example 1: Differentiating Azure Resource Naming

A common requirement is to have distinct names for resources across environments to prevent naming conflicts and clearly identify resources belonging to a specific environment.

typescript

```
// index.ts
import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";
import * as azure_native from "@pulumi/azure-native";

// Create a Pulumi Config object
const config = new pulumi.Config();

// Retrieve the environment prefix from configuration
// This value will be different for each stack (e.g., "dev", "test", "prod")
const environment = config.require("environment");

// Define common tags for all resources in this environment
const tags = {
    environment: environment,
    project: "mywebapp",
};

// Create an Azure Resource Group, prefixed by the environment
const resourceGroup = new azure_native.resources.ResourceGroup(`${environment}-webapp-rg`, {
    resourceGroupName: `${environment}-webapp-rg`,
    location: "eastus",
    tags: tags,
});

// Create an Azure Storage Account, also prefixed
const storageAccount = new azure_native.storage.StorageAccount(`${environment}-webappstorage`, {
    accountName: `${environment}webappstorage`, // Azure storage account names must be globally unique and lowercase
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    sku: {
        name: config.get("storageSku") || "Standard_LRS", // Allow SKU to be configured, default to LRS
    },
    kind: "StorageV2",
    tags: tags,
});

// Export the primary connection string for the storage account
export const primaryStorageConnectionString = storageAccount.primaryConnectionString;
export const resourceGroupNameOutput = resourceGroup.name;
```

To deploy this code to different environments:

1. **Initialize `dev` stack and configure:**
    
    bash
    
    ```
    pulumi stack init devpulumi config set environment devpulumi config set storageSku Standard_LRS # Cheaper for devpulumi up --yes
    ```
    
    This will create resources like `dev-webapp-rg` and `devwebappstorage`.
    
2. **Initialize `test` stack and configure:**
    
    bash
    
    ```
    pulumi stack init testpulumi config set environment testpulumi config set storageSku Standard_GRS # More resilient for testpulumi up --yes
    ```
    
    This will create resources like `test-webapp-rg` and `testwebappstorage`.
    
3. **Initialize `prod` stack and configure:**
    
    bash
    
    ```
    pulumi stack init prodpulumi config set environment prodpulumi config set storageSku Standard_ZRS # Highly available for prodpulumi up --yes
    ```
    
    This will create resources like `prod-webapp-rg` and `prodwebappstorage`.
    

Notice how the `environment` and `storageSku` configuration values allow the same `index.ts` file to produce distinct and appropriately configured infrastructure for each stack.

### Example 2: Configuring Resource Sizes and Tiers

Beyond just naming, stacks are ideal for specifying different resource sizes, tiers, or capabilities. For instance, a development environment might use a basic, low-cost Azure App Service Plan, while production uses a PremiumV3 plan with auto-scaling.

typescript

```
// index.ts (continued, assuming previous resourceGroup exists)
import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";
import * as azure_native from "@pulumi/azure-native";

const config = new pulumi.Config();
const environment = config.require("environment");
const tags = {
    environment: environment,
    project: "mywebapp",
};

const resourceGroup = new azure_native.resources.ResourceGroup(`${environment}-webapp-rg`, {
    resourceGroupName: `${environment}-webapp-rg`,
    location: "eastus",
    tags: tags,
});

// Define App Service Plan SKU based on configuration
const appServicePlanSkuName = config.require("appServicePlanSkuName");
const appServicePlanSkuTier = config.require("appServicePlanSkuTier");
const appServicePlanSkuCapacity = config.getNumber("appServicePlanSkuCapacity") || 1; // Default to 1 instance

// Create an Azure App Service Plan
const appServicePlan = new azure_native.web.AppServicePlan(`${environment}-webapp-asp`, {
    name: `${environment}-webapp-asp`,
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    sku: {
        name: appServicePlanSkuName,
        tier: appServicePlanSkuTier,
        capacity: appServicePlanSkuCapacity,
    },
    tags: tags,
});

// Create an Azure App Service (Web App)
const appService = new azure_native.web.WebApp(`${environment}-webapp`, {
    name: `${environment}-webapp`,
    resourceGroupName: resourceGroup.name,
    serverFarmId: appServicePlan.id,
    location: resourceGroup.location,
    httpsOnly: true,
    siteConfig: {
        // ... additional site configurations
    },
    tags: tags,
});

export const appServiceUrl = appService.defaultHostName.apply(hostName => `https://${hostName}`);
```

To deploy this:

1. **Configure `dev` stack:**
    
    bash
    
    ```
    pulumi stack select devpulumi config set appServicePlanSkuName B1 # Basic tier, low costpulumi config set appServicePlanSkuTier Basicpulumi config set appServicePlanSkuCapacity 1pulumi up --yes
    ```
    
2. **Configure `test` stack:**
    
    bash
    
    ```
    pulumi stack select testpulumi config set appServicePlanSkuName S1 # Standard tier, more featurespulumi config set appServicePlanSkuTier Standardpulumi config set appServicePlanSkuCapacity 2pulumi up --yes
    ```
    
3. **Configure `prod` stack:**
    
    bash
    
    ```
    pulumi stack select prodpulumi config set appServicePlanSkuName P1V3 # PremiumV3 tier, high performance, auto-scalingpulumi config set appServicePlanSkuTier PremiumV3pulumi config set appServicePlanSkuCapacity 3 # Starting capacity, can be autoscaledpulumi up --yes
    ```
    

This approach allows engineers to quickly provision different environments by simply selecting a stack and running `pulumi up`, with all environment-specific details handled by configuration.

## Managing Stacks and their Lifecycles

### Listing Stacks

To see all stacks associated with your current project, use `pulumi stack ls`. This command shows the current stack, the last update time, and the number of resources.

bash

```
pulumi stack ls
```

### Renaming Stacks

If you need to rename a stack, you can use `pulumi stack rename`. This updates the stack name in your project's `Pulumi.yaml` file and within the Pulumi backend.

bash

```
pulumi stack rename old-stack-name new-stack-name
```

### Deleting Stacks

Before deleting a stack, it's critical to destroy all resources provisioned within that stack. This is done with `pulumi destroy`. After all resources are removed, you can then remove the stack's metadata and state file using `pulumi stack rm`.

bash

```
# First, destroy all resources in the 'dev' stackpulumi stack select devpulumi destroy --yes# Then, remove the stack metadatapulumi stack rm dev
```

Failing to run `pulumi destroy` before `pulumi stack rm` will leave orphaned resources in your cloud provider, which can incur unexpected costs.