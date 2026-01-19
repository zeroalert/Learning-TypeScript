Structuring Pulumi Azure projects effectively is crucial for maintainability, scalability, and collaboration, especially as your infrastructure grows in complexity. A well-organized project enhances readability, simplifies debugging, and streamlines the adoption of best practices like component reusability and environment separation. This lesson explores various strategies for organizing your Pulumi TypeScript projects targeting Azure resources, building upon the foundational knowledge of deploying individual Azure resources like Storage Accounts, Virtual Networks, Virtual Machines, App Services, and SQL Databases discussed in previous lessons.

## Monorepo vs. Multirepo Project Structures

When designing your Pulumi project structure, a primary decision involves choosing between a monorepo or a multirepo approach. Each has distinct advantages and disadvantages depending on team size, project complexity, and organizational culture.

### Monorepo Structure

A monorepo (monolithic repository) houses multiple distinct Pulumi projects within a single Git repository. Each Pulumi project within the monorepo typically resides in its own subdirectory, containing its `Pulumi.yaml`, `index.ts`, and `package.json` files.

**Advantages:**

- **Simplified dependency management:** Shared components or utility code can be easily referenced across different Pulumi projects within the same repository.
- **Atomic commits:** Changes spanning multiple infrastructure components can be committed and reviewed together, ensuring consistency.
- **Easier code sharing and reuse:** Encourages the creation of internal component libraries that can be consumed by various projects.
- **Streamlined CI/CD:** A single CI/CD pipeline can potentially manage all infrastructure deployments, simplifying orchestration.

**Disadvantages:**

- **Increased repository size:** Can become large and slow for cloning or operations as the number of projects grows.
- **Access control complexity:** Granular access control per project can be challenging; if a user has access to the monorepo, they usually have access to all projects within it.
- **Impact of changes:** A single change might trigger CI/CD runs for all projects, even if only one project is affected, leading to longer build times unless intelligent change detection is implemented.

```
my-azure-infra-monorepo/
├── Pulumi.yaml
├── index.ts
├── package.json
├── tsconfig.json
├── components/
│   ├── azure-vnet-component/
│   │   ├── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── azure-storage-component/
│       ├── index.ts
│       ├── package.json
│       └── tsconfig.json
├── services/
│   ├── web-app-infra/
│   │   ├── Pulumi.yaml
│   │   ├── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── api-app-infra/
│   │   ├── Pulumi.yaml
│   │   ├── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── database-infra/
│       ├── Pulumi.yaml
│       ├── index.ts
│       ├── package.json
│       └── tsconfig.json
├── shared-config/
│   └── index.ts
└── README.md
```

In this structure:

- `components/`: Contains reusable Pulumi _components_ (TypeScript classes or functions) that encapsulate common infrastructure patterns, such as a standardized virtual network setup or a resilient storage account configuration. These are not full Pulumi _projects_ themselves but rather libraries of resources.
- `services/`: Each subdirectory represents a distinct Pulumi _project_ responsible for deploying a specific service's infrastructure (e.g., a web application, an API, or a database). Each project has its own `Pulumi.yaml` and `index.ts`.
- `shared-config/`: Could hold common configuration values or helper functions that are used across multiple projects.

### Multirepo Structure

A multirepo (multiple repositories) approach dedicates a separate Git repository to each Pulumi project. Each repository contains a single, self-contained Pulumi project.

**Advantages:**

- **Clear separation of concerns:** Each repository focuses on a specific part of the infrastructure, making it easier to understand and manage.
- **Granular access control:** Permissions can be set independently for each repository, allowing for fine-grained security.
- **Independent deployments:** Changes in one project do not automatically affect others, leading to faster CI/CD cycles for individual components.
- **Smaller repository size:** Each repository remains relatively small and manageable.

**Disadvantages:**

- **Complex dependency management:** Sharing code or components across repositories requires publishing them as npm packages or using Git submodules, adding overhead.
- **Orchestration challenges:** Deploying interdependent services across multiple repositories can require complex CI/CD orchestration.
- **Consistency issues:** Maintaining consistent patterns or configurations across many repositories can be challenging without strong governance.

```
# Repository 1: azure-web-app-infra/
azure-web-app-infra/
├── Pulumi.yaml
├── index.ts
├── package.json
├── tsconfig.json
└── README.md

# Repository 2: azure-api-app-infra/
azure-api-app-infra/
├── Pulumi.yaml
├── index.ts
├── package.json
├── tsconfig.json
└── README.md

# Repository 3: azure-database-infra/
azure-database-infra/
├── Pulumi.yaml
├── index.ts
├── package.json
├── tsconfig.json
└── README.md

# Repository 4: azure-shared-components/ (optional, for reusable components)
azure-shared-components/
├── my-vnet-component/
│   ├── index.ts
│   ├── package.json
│   └── tsconfig.json
└── my-storage-component/
    ├── index.ts
    ├── package.json
    └── tsconfig.json
```

Proper Repo Management 

In this scenario, each `azure-*-infra` directory would be its own Git repository. Reusable components (like `my-vnet-component`) could either be copied, published as private npm packages, or referenced via Git submodules if a separate `azure-shared-components` repository exists.

An "infra stack" for an application, within a per-stack project model, implies a dedicated Pulumi project and its stacks solely managing the core infrastructure _for that specific application_.

For instance, an `OrderService` application might have its own Pulumi project structure like this:

JavaScript

```
OrderService-Infra/
├── Pulumi.yaml
├── index.ts
├── Pulumi.dev.yaml
├── Pulumi.staging.yaml
└── Pulumi.prod.yaml
```

Here:

- `OrderService-Infra` is the Pulumi project.
- `index.ts` defines the Azure resources specific to the `OrderService` (e.g., App Service Plan, App Service, Azure SQL DB, Storage Account).
- `Pulumi.dev.yaml`, `Pulumi.staging.yaml`, `Pulumi.prod.yaml` are the configuration files for its respective stacks (`dev`, `staging`, `prod`).

**Key characteristics of this approach:**

- **Application-centric Ownership:** The team owning `OrderService` also owns its infrastructure definition.
- **Encapsulation:** All infrastructure required _by_ the `OrderService` application resides within this single Pulumi project and its stacks. This provides a clear boundary.
- **Independent Lifecycle:** Deployment, updates, and destruction of `OrderService`'s infrastructure are managed independently of other applications.
- **Stack Parity (within project):** Each stack within the `OrderService-Infra` project represents a deployment of the same infrastructure definition (`index.ts`) but with environment-specific configurations from its `Pulumi.<stack>.yaml` file. This ensures consistency across environments for _that application's_ infrastructure.

This approach aligns with microservices architectures, where each service is responsible for its own compute, data, and supporting infrastructure. It avoids a monolithic infrastructure project while still allowing for stack-based environment management _per application_.

In this model, you'd typically have a separate, dedicated "Core Infra" Pulumi project.

This **Core Infra project** manages resources that are:

1. **Shared across multiple applications or services:** e.g., hub Virtual Networks, shared DNS zones, central logging solutions (Log Analytics Workspace), Azure Firewall, Load Balancers for ingress, central Key Vaults, Azure Front Door, ExpressRoute circuits.
2. **Platform-level concerns:** Foundational services that provide the underlying substrate for all applications.
3. **Managed by a central platform or operations team:** Distinct from individual application teams.

**Structure example:**

JavaScript

```
Core-Infra/
├── Pulumi.yaml
├── index.ts
├── Pulumi.dev.yaml
├── Pulumi.staging.yaml
└── Pulumi.prod.yaml
```

**Interaction with Application Infra:**

Application-specific infra stacks (like `OrderService-Infra`) would then depend on outputs from the relevant `Core-Infra` stack. For example:

- `OrderService-Infra` might need the VNet ID or Subnet ID created by `Core-Infra` to deploy its App Service into.
- It might reference the Log Analytics Workspace ID for diagnostics.

This dependency is crucial. `Core-Infra` is deployed first, providing the foundational network, security, and shared services. Then, individual application infra projects build upon that foundation, deploying their specific resources within the established framework. This creates a clear hierarchy and separation of concerns.


## Organizing Resources within a Single Pulumi Project

Regardless of whether you choose a monorepo or multirepo structure, organizing resources _within_ a single Pulumi project is critical. This involves structuring your `index.ts` file and potentially using helper modules or components.

### Logical Grouping with Files and Folders

For larger projects, putting all resource definitions into a single `index.ts` file quickly becomes unwieldy. Breaking down your infrastructure into logical groups, each in its own TypeScript file or subdirectory, greatly improves maintainability.

**Scenario:** Deploying a web application with a database, storage, and networking components.

Instead of one massive `index.ts`:

``` typescript
// index.ts (avoid this for complex projects)
import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";

// Resource Group
const resourceGroup = new azure.resources.ResourceGroup("my-rg", {
    resourceGroupName: "my-web-app-rg",
    location: "East US",
});

// VNet
const vnet = new azure.network.VirtualNetwork("my-vnet", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    addressSpace: { addressPrefixes: ["10.0.0.0/16"] },
});

// Subnet
const subnet = new azure.network.Subnet("my-subnet", {
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: vnet.name,
    addressPrefix: "10.0.1.0/24",
});

// Storage Account
const storageAccount = new azure.storage.StorageAccount("my-storage", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    sku: { name: "Standard_LRS" },
    kind: "StorageV2",
});

// App Service Plan
const appServicePlan = new azure.web.AppServicePlan("my-app-plan", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    sku: { name: "B1", tier: "Basic" },
});

// App Service
const app = new azure.web.WebApp("my-webapp", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    serverFarmId: appServicePlan.id,
    siteConfig: {
        appSettings: [
            { name: "STORAGE_CONNECTION_STRING", value: storageAccount.primaryConnectionString },
        ],
    },
});

// SQL Server
const sqlServer = new azure.sql.Server("my-sql-server", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    administratorLogin: "pulumiadmin",
    administratorLoginPassword: "StrongPassword123!", // In a real scenario, use Pulumi secrets for passwords
    version: "12.0",
});

// SQL Database
const sqlDatabase = new azure.sql.Database("my-sql-db", {
    resourceGroupName: resourceGroup.name,
    serverName: sqlServer.name,
    sku: { name: "Basic" },
});

// Outputs
export const resourceGroupName = resourceGroup.name;
export const webAppUrl = app.defaultHostName;
```

A better approach is to break it down:

javascript

```
my-web-app-project/├── Pulumi.yaml├── index.ts├── package.json├── tsconfig.json├── resources/│   ├── networking.ts│   ├── storage.ts│   ├── webapp.ts│   └── database.ts└── config.ts
```

And then your `index.ts` becomes an orchestrator:


```
// index.ts
import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import { createNetworking } from "./resources/networking";
import { createStorage } from "./resources/storage";
import { createWebApp } from "./resources/webapp";
import { createDatabase } from "./resources/database";
import { config } from "./config"; // Import configuration

// Create a resource group
const resourceGroup = new azure.resources.ResourceGroup("my-rg", {
    resourceGroupName: config.resourceGroupName,
    location: config.location,
});

// Pass the resourceGroup to other functions for resource creation
const networking = createNetworking(resourceGroup);
const storage = createStorage(resourceGroup);
const database = createDatabase(resourceGroup, config.sqlAdminPassword); // Pass password as secret
const webapp = createWebApp(resourceGroup, networking.subnet, storage.storageAccount, database.sqlServer);

// Export key outputs
export const resourceGroupName = resourceGroup.name;
export const webAppUrl = webapp.app.defaultHostName;
export const storageAccountName = storage.storageAccount.name;
export const sqlServerName = database.sqlServer.name;
```

Each file under `resources/` would export functions that create specific sets of resources:

```
// resources/networking.ts
import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";

interface NetworkingOutputs {
    vnet: azure.network.VirtualNetwork;
    subnet: azure.network.Subnet;
}

export function createNetworking(resourceGroup: azure.resources.ResourceGroup): NetworkingOutputs {
    // VNet
    const vnet = new azure.network.VirtualNetwork("my-vnet", {
        resourceGroupName: resourceGroup.name,
        location: resourceGroup.location,
        addressSpace: { addressPrefixes: ["10.0.0.0/16"] },
        // ... other VNet specific settings
    });

    // Subnet
    const subnet = new azure.network.Subnet("my-subnet", {
        resourceGroupName: resourceGroup.name,
        virtualNetworkName: vnet.name,
        addressPrefix: "10.0.1.0/24",
        // ... other Subnet specific settings
    });

    return { vnet, subnet };
}
```


```
// resources/storage.ts
import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";

interface StorageOutputs {
    storageAccount: azure.storage.StorageAccount;
}

export function createStorage(resourceGroup: azure.resources.ResourceGroup): StorageOutputs {
    const storageAccount = new azure.storage.StorageAccount("my-storage", {
        resourceGroupName: resourceGroup.name,
        location: resourceGroup.location,
        sku: { name: "Standard_LRS" },
        kind: "StorageV2",
        // ... other Storage Account specific settings
    });

    return { storageAccount };
}
```

This modular approach makes each part of the infrastructure easier to reason about, test, and update.

### Using Pulumi Components for Reusability

For more complex or frequently repeated patterns, _Pulumi Components_ (covered in detail in Module 5) provide a powerful abstraction mechanism. A Component Resource is a custom Pulumi resource that encapsulates a group of other resources, allowing you to treat them as a single logical unit. While full details are in Module 5, understanding their role in structuring is important now.

**Hypothetical Scenario:** A company frequently deploys "secure web application environments" which always consist of an App Service, an isolated Subnet, an Azure Key Vault for secrets, and a Network Security Group (NSG).

Instead of recreating these four resources every time, you could define a `SecureWebAppEnvironment` component.

```
// components/secureWebAppEnvironment.ts (Simplified for this lesson's context)
import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";

interface SecureWebAppEnvironmentArgs {
    resourceGroupName: pulumi.Input<string>;
    location: pulumi.Input<string>;
    appName: string;
    vnetId: pulumi.Input<string>; // ID of an existing VNet
    vnetAddressPrefix: string; // The prefix for the new subnet
    administratorLoginPassword: pulumi.Input<string>; // For SQL, handled as a secret
}

export class SecureWebAppEnvironment extends pulumi.ComponentResource {
    public readonly appServicePlanId: pulumi.Output<string>;
    public readonly webAppUrl: pulumi.Output<string>;
    public readonly keyVaultUri: pulumi.Output<string>;
    public readonly sqlServerName: pulumi.Output<string>;

    constructor(name: string, args: SecureWebAppEnvironmentArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:x:SecureWebAppEnvironment", name, args, opts);

        const resourceGroup = new azure.resources.ResourceGroup(`${name}-rg`, {
            resourceGroupName: args.resourceGroupName,
            location: args.location,
        }, { parent: this });

        // Networking: Isolated Subnet and NSG
        const appSubnet = new azure.network.Subnet(`${name}-subnet`, {
            resourceGroupName: resourceGroup.name,
            virtualNetworkName: args.vnetId.apply(id => id.split('/').pop()!), // Extract VNet name from ID
            addressPrefix: args.vnetAddressPrefix,
            delegations: [{
                name: "appserviceDelegation",
                serviceName: "Microsoft.Web/serverFarms",
            }],
        }, { parent: this });

        const nsg = new azure.network.NetworkSecurityGroup(`${name}-nsg`, {
            resourceGroupName: resourceGroup.name,
            location: resourceGroup.location,
            securityRules: [
                {
                    name: "Allow_HTTPS_Inbound",
                    priority: 100,
                    direction: "Inbound",
                    access: "Allow",
                    protocol: "Tcp",
                    sourcePortRange: "*",
                    destinationPortRange: "443",
                    sourceAddressPrefix: "Internet",
                    destinationAddressPrefix: "*",
                },
                // ... other security rules
            ],
        }, { parent: this });

        new azure.network.SubnetNetworkSecurityGroupAssociation(`${name}-subnet-nsg-association`, {
            subnetId: appSubnet.id,
            networkSecurityGroupId: nsg.id,
        }, { parent: this });

        // App Service Plan
        const appServicePlan = new azure.web.AppServicePlan(`${name}-plan`, {
            resourceGroupName: resourceGroup.name,
            location: resourceGroup.location,
            sku: { name: "P1V2", tier: "PremiumV2" },
            kind: "Linux",
            reserved: true, // For Linux plans
            // ... other plan settings
        }, { parent: this });

        // App Service
        const app = new azure.web.WebApp(`${name}-app`, {
            resourceGroupName: resourceGroup.name,
            location: resourceGroup.location,
            serverFarmId: appServicePlan.id,
            siteConfig: {
                appSettings: [
                    { name: "SOME_SETTING", value: "someValue" },
                ],
            },
            httpsOnly: true,
            clientCertEnabled: true, // Example of security feature
        }, { parent: this });

        // Key Vault
        const keyVault = new azure.keyvault.Vault(`${name}-kv`, {
            resourceGroupName: resourceGroup.name,
            location: resourceGroup.location,
            properties: {
                sku: { family: "A", name: "standard" },
                tenantId: "YOUR_TENANT_ID", // Replace with actual tenant ID
                accessPolicies: [], // Define access policies
            },
        }, { parent: this });

        // SQL Server
        const sqlServer = new azure.sql.Server(`${name}-sql`, {
            resourceGroupName: resourceGroup.name,
            location: resourceGroup.location,
            administratorLogin: "pulumiadmin",
            administratorLoginPassword: args.administratorLoginPassword,
            version: "12.0",
        }, { parent: this });

        this.appServicePlanId = appServicePlan.id;
        this.webAppUrl = app.defaultHostName;
        this.keyVaultUri = keyVault.properties.vaultUri;
        this.sqlServerName = sqlServer.name;

        this.registerOutputs({
            appServicePlanId: this.appServicePlanId,
            webAppUrl: this.webAppUrl,
            keyVaultUri: this.keyVaultUri,
            sqlServerName: this.sqlServerName,
        });
    }
}
```

Then, in your `index.ts` or another resource file, you can provision an entire secure web app environment with a single line:

```
// index.ts or services/webapp.ts
import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import { SecureWebAppEnvironment } from "../components/secureWebAppEnvironment";
import { config } from "../config"; // Assume config holds sensitive values

// Assume a VNet already exists or is created by another part of the project
const existingVnet = azure.network.getVirtualNetwork({
    resourceGroupName: config.resourceGroupName,
    virtualNetworkName: "my-existing-vnet",
});

const myWebAppEnv = new SecureWebAppEnvironment("prod-webapp-01", {
    resourceGroupName: config.resourceGroupName,
    location: config.location,
    appName: "my-production-app",
    vnetId: existingVnet.then(v => v.id),
    vnetAddressPrefix: "10.0.10.0/24",
    administratorLoginPassword: config.sqlAdminPassword, // From Pulumi config, already a Secret
});

export const prodWebAppUrl = myWebAppEnv.webAppUrl;
export const prodKeyVaultUri = myWebAppEnv.keyVaultUri;
```

This approach significantly reduces boilerplate code and ensures consistent deployments of complex infrastructure patterns. While we will deep-dive into creating custom components in Module 5, understanding that they are a key organizational tool is valuable now.
## Configuration Management

Effective configuration management is paramount for flexible and scalable Pulumi projects. Pulumi provides a built-in configuration system accessible via `Pulumi.yaml` and the Pulumi CLI.

### Pulumi Configuration Files

Pulumi projects use `Pulumi.<stack-name>.yaml` files to store configuration values specific to a stack. The `Pulumi.yaml` file defines the project name, runtime, and describes the project itself.

**Example `Pulumi.yaml`:**
```
name: my-web-app-project
runtime: nodejs
description: A Pulumi project to deploy an Azure web application.
```

**Example `Pulumi.dev.yaml`:**

```
config:
  azure-native:location: EastUS
  my-web-app-project:resourceGroupName: dev-webapp-rg
  my-web-app-project:environment: development
  my-web-app-project:sqlAdminPassword:
    secure: AAABAK0gM... # Encrypted secret
```
You can access these configuration values in your TypeScript code using `new pulumi.Config()`.
```
// config.ts
import * as pulumi from "@pulumi/pulumi";

const pulumiConfig = new pulumi.Config();

export const config = {
    location: pulumiConfig.require("azure-native:location"),
    resourceGroupName: pulumiConfig.require("resourceGroupName"),
    environment: pulumiConfig.require("environment"),
    sqlAdminPassword: pulumiConfig.requireSecret("sqlAdminPassword"), // For sensitive data
};
```
This centralizes environment-specific settings, allowing you to deploy the same code to different environments (e.g., development, staging, production) by simply switching Pulumi stacks (`pulumi up --stack dev` vs `pulumi up --stack prod`).

### Handling Secrets

Passwords, API keys, and other sensitive information should never be hardcoded or stored in plain text in your version control system. Pulumi's built-in secret management provides encryption for configuration values.

When you set a configuration value as a secret, Pulumi encrypts it:

```
pulumi config set --secret sqlAdminPassword "SuperSecurePassword123!"
```

The output in your `Pulumi.<stack-name>.yaml` will look like:


```
config:  my-web-app-project:sqlAdminPassword:    secure: AAABAK0gM... # This is the encrypted value
```

In your TypeScript code, retrieve it using `pulumiConfig.requireSecret()` as shown in the `config.ts` example above. When Pulumi runs, it decrypts the secret for use during resource provisioning but never exposes it in plain text in logs or state files (unless explicitly exported as an output without `Output.secret()`).

## Naming Conventions

Consistent naming conventions are vital for clarity and maintainability, especially in cloud environments where resource names can be complex. While Azure has some naming restrictions, establishing project-specific guidelines is beneficial.

**Best Practices for Naming:**

- **Consistency:** Apply a consistent pattern across all resources.
- **Meaningful:** Names should indicate the resource type, purpose, and environment.
- **Prefix/Suffix:** Use prefixes or suffixes to denote environment, application, or resource type.
- **Azure Naming Rules:** Always adhere to Azure's specific naming rules (e.g., storage account names must be globally unique, 3-24 characters, lowercase alphanumeric).

**Example Convention:** `{project}-{environment}-{resource-type}-{identifier}`

|Resource Type|Example Name (Dev)|Example Name (Prod)|
|---|---|---|
|Resource Group|`myapp-dev-rg`|`myapp-prod-rg`|
|Storage Account|`myappdevstg01`|`myappprodstg01`|
|Virtual Network|`myapp-dev-vnet`|`myapp-prod-vnet`|
|Subnet|`myapp-dev-subnet-webapp`|`myapp-prod-subnet-webapp`|
|App Service Plan|`myapp-dev-asp`|`myapp-prod-asp`|
|Web App|`myapp-dev-webapp`|`myapp-prod-webapp`|
|SQL Server|`myapp-dev-sqlserver`|`myapp-prod-sqlserver`|
|SQL Database|`myapp-dev-sqldb`|`myapp-prod-sqldb`|
|Key Vault|`myapp-dev-kv`|`myapp-prod-kv`|

By using configuration values for `project` and `environment`, you can easily generate resource names dynamically:
```
// resources/storage.ts
import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";
import { config } from "../config"; // Assuming config has project and environment

interface StorageOutputs {
    storageAccount: azure.storage.StorageAccount;
}

export function createStorage(resourceGroup: azure.resources.ResourceGroup): StorageOutputs {
    const storageAccountName = `${config.project}${config.environment}stg01`.toLowerCase(); // Ensure global uniqueness and Azure rules

    const storageAccount = new azure.storage.StorageAccount(storageAccountName, {
        resourceGroupName: resourceGroup.name,
        location: resourceGroup.location,
        accountName: storageAccountName, // Explicitly set the account name
        sku: { name: "Standard_LRS" },
        kind: "StorageV2",
    });

    return { storageAccount };
}
```

This practice makes it clear which resources belong to which application and environment, simplifying management in the Azure portal and command-line tools.


