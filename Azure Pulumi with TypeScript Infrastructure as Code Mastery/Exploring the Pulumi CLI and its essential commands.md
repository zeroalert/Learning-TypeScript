
- The Pulumi Command Line Interface (CLI) is the primary tool for interacting with your Pulumi projects and managing your infrastructure deployments. 
- The Pulumi CLI provides a suite of commands to manage the lifecycle of your infrastructure. These commands operate on Pulumi projects and stacks, which were introduced in the previous lessons. 
### `pulumi new`

The `pulumi new` command initiates a new Pulumi project from a template. This command is typically the first step when starting a new infrastructure project. It guides you through selecting a cloud provider, a language (like TypeScript), and provides a basic project structure.

``` typescript

// Example of a basic Pulumi project structure created by 'pulumi new'
// index.ts - the main program file where resources are defined
import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup("my-resource-group", {
    location: "West US", // Default location, can be configured
});

// Export the name of the resource group
export const resourceGroupName = resourceGroup.name;

// Pulumi.yaml - project metadata
// name: my-azure-project
// runtime: nodejs
// description: A minimal Azure Pulumi project

// Pulumi.<stack-name>.yaml - stack-specific configuration
// config:
//   azure:location: West US
```

When you run `pulumi new azure-typescript`, Pulumi will prompt you for a project name, description, and stack name. It then generates the necessary files (`index.ts`, `Pulumi.yaml`, `package.json`, etc.) and installs dependencies.

### `pulumi up`
The `pulumi up` command is used to deploy or update your infrastructure. When executed, Pulumi performs a "preview" operation, which compares your desired state (defined in your TypeScript code) with the current state of your cloud resources. It then presents a summary of the proposed changes (creations, updates, deletions) and prompts for confirmation before applying them.

``` typescript
// index.ts (continued from pulumi new example)

// Create an Azure Storage Account within the resource group
const storageAccount = new azure.storage.Account("mystorageaccount", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    accountTier: "Standard",
    accountReplicationType: "LRS",
});

// Export the primary connection string of the storage account
export const primaryStorageConnectionString = storageAccount.primaryConnectionString;
```

When `pulumi up` is run after adding the storage account code, the CLI will output something similar to:

```
Previewing update (dev)

     Type                             Name                         Plan
 +   pulumi:pulumi:Stack              my-azure-project-dev         create
 +   azure:core:ResourceGroup         my-resource-group            create
 +   azure:storage:Account            mystorageaccount             create

Resources:
    + 3 to create

Do you want to perform this update?  yes
```

This output shows that Pulumi plans to create three resources: the stack itself, the resource group, and the storage account. Upon confirmation, Pulumi provisions these resources in Azure.

### `pulumi destroy`

The `pulumi destroy` command tears down all resources managed by a specific Pulumi stack. It is the inverse of `pulumi up`. Like `pulumi up`, it performs a preview before executing, showing which resources will be deleted. This command is irreversible once confirmed, so caution is advised.

``` bash
pulumi destroy
```

```
Previewing destroy (dev)

     Type                             Name                         Plan
 -   azure:storage:Account            mystorageaccount             delete
 -   azure:core:ResourceGroup         my-resource-group            delete
 -   pulumi:pulumi:Stack              my-azure-project-dev         delete

Resources:
    - 3 to delete

Do you want to perform this destroy?  yes
```

Upon confirmation, all managed resources, including the storage account and resource group, will be removed from Azure.

### `pulumi stack`

The `pulumi stack` command manages Pulumi stacks. Stacks are isolated instances of your Pulumi project, often used to represent different deployment environments (e.g., `dev`, `staging`, `prod`).

#### `pulumi stack init <stack-name>`

Creates a new empty stack.

bash

```
pulumi stack init staging
```

This command initializes a new `Pulumi.staging.yaml` file for stack-specific configuration.

#### `pulumi stack select <stack-name>`

Switches the currently active stack. Subsequent `pulumi up` or `pulumi destroy` commands will operate on the selected stack.

bash

```
pulumi stack select dev
```

#### `pulumi stack ls`

Lists all stacks associated with the current project.

bash

```
pulumi stack ls
```

Output:

JavaScript

```
NAME     LAST UPDATE     RESOURCE COUNT  URLdev*     2 hours ago     3               https://app.pulumi.com/your-org/my-azure-project/devstaging  n/a             0               https://app.pulumi.com/your-org/my-azure-project/staging
```

The `*` indicates the currently active stack.
### `pulumi config`

The `pulumi config` command manages configuration values for the currently selected stack. Configuration allows you to parameterize your infrastructure code, making it reusable across different stacks or environments without changing the underlying TypeScript.

#### `pulumi config set <key> <value>`

Sets a configuration value for the current stack.

bash

```
pulumi config set azure:location "East US"pulumi config set projectName "CoolApp" --secret
```

The `--secret` flag encrypts the value, preventing it from being stored in plain text in the `Pulumi.<stack-name>.yaml` file. This is crucial for sensitive data like API keys or connection strings.

yaml

```
# Pulumi.dev.yaml example after setting config valuesconfig:  azure:location: East US  projectName: CoolApp  # projectName is encrypted, so it appears as a ciphertext here  # This value would be decrypted by Pulumi during 'pulumi up'  projectName:    secure: AAAB... (encrypted value)
```

#### `pulumi config get <key>`

Retrieves a configuration value from the current stack.

bash

```
pulumi config get azure:location
```

#### `pulumi config ls`

Lists all configuration values for the current stack.

bash

```
pulumi config ls
```

Output:

javascript

```
KEY             VALUEazure:location  East USprojectName     [secret]
```

### `pulumi refresh`

The `pulumi refresh` command compares the state of your deployed cloud resources with the Pulumi state file, updating the state file to reflect any manual changes made directly in the cloud provider's console or API. It does not modify your cloud resources, only the Pulumi state.

bash

```
pulumi refresh
```

This command is useful when you suspect your Pulumi state file might be out of sync with the actual cloud resources.

### `pulumi preview`

The `pulumi preview` command shows a proposed plan of changes without actually performing them. It's automatically run as part of `pulumi up`, but you can execute it independently to review changes before committing to an update.

bash

```
pulumi preview
```

This provides a crucial safety net, allowing developers to verify the impact of their infrastructure code changes before deployment.