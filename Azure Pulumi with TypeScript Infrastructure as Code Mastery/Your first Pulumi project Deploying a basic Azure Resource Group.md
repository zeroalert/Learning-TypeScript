
## Project Initialization
- Every pulumi project begins with initialization. This step sets up the necessary project structure, including configuration files and the main program file, in your chosen language. For Azure deployments with Typescript, Pulumi creates a `Pulumi.yaml` file, a `tsconfig.json` for TypeScript compilation, and a `index.ts` file where your infrastructure code resides.
- The Pulumi CLI command `pulumi new azure-typescript` performs this initialization. When executed, it prompts you for a project name, a project description, and a stack name. The project name identifies your pulumi project, while the stack name represents a distinct deployment environment (e.g., `dev`, `staging`, `prod`,). Each stack maintains its own independent state, allowing you to manage multiple versions or environments of your infrastructure from a single project. 
- After initialization, Pulumi installs the required npm packages, including `@pulumi/azure-native`, which provides the Azure resource types you will use. The `@pulumi/azure-native` package is a provider plugin that translates your TypeScript code into Azure API calls.
- For example, to initialize a new project named `my-azure-rg-project` with a `dev` stack:

bash

```
pulumi new azure-typescript
```

When prompted:

- **project name:** my-azure-rg-project
- **project description:** A basic Azure Resource Group deployment
- **stack name:** dev

This command creates a directory named `my-azure-rg-project` containing the following core files:

- `Pulumi.yaml`: Defines the project's metadata, such as its name, runtime (TypeScript), and description.
- `tsconfig.json`: TypeScript configuration file for compiling your `.ts` files into JavaScript.
- `index.ts`: The main entry point for your Pulumi program where you define your Azure resources.
- `package.json` and `package-lock.json`: Standard Node.js files for managing project dependencies.
## Defining an Azure Resource Group in TypeScript
- An Azure Resource Group is a fundamental container for Azure resources. It logically groups related resources, simplifying their management, monitoring, and deletion. All Azure resources must reside within a resource group. When defining an Azure Resource Group with Pulumi and TypeScript, you use the `ResourceGroup` class from the `@pulumi/azure-native/resources` module. 
- The `ResourceGroup` class requires a unique name for the resource within your Pulumi program (known as the "logical name" or "URN name") and an object containing its properties. The essential property for a `ResourceGroup` is `resourceGroupName`, which defines the name of the resource group in Azure, and `location`, which specifies the Azure region where the resource group will be created. 

Consider the following `index.ts` content: 
``` TypeScript
import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources"; // Import the resources module

// Create an Azure Resource Group
const resourceGroup = new resources.ResourceGroup("my-resource-group", {
    // The name of the resource group in Azure
    resourceGroupName: "my-first-pulumi-rg",
    // The Azure region where the resource group will be created
    location: "East US",
});

// Export the name of the resource group
// This allows you to easily retrieve the resource group name after deployment
export const resourceGroupName = resourceGroup.name;

// Export the ID of the resource group
export const resourceGroupId = resourceGroup.id;
```

In this code:
- - `import * as resources from "@pulumi/azure-native/resources";` imports the necessary module for creating Azure resource groups.
- `new resources.ResourceGroup("my-resource-group", { ... });` instantiates a new `ResourceGroup`.
    - `"my-resource-group"` is the logical name given to this resource within the Pulumi program. This name is used internally by Pulumi for tracking the resource.
    - The second argument is an object `{ resourceGroupName: "my-first-pulumi-rg", location: "East US" }` containing the properties that define the actual Azure Resource Group.
        - `resourceGroupName: "my-first-pulumi-rg"` sets the name that will appear in the Azure portal and API.
        - `location: "East US"` specifies the Azure region for the resource group.
- `export const resourceGroupName = resourceGroup.name;` and `export const resourceGroupId = resourceGroup.id;` are Pulumi _outputs_. Outputs are values from your infrastructure that you want to easily retrieve after a deployment. Here, we export the name and ID of the created resource group, which can be useful for verification or for connecting other resources later.

## Deploying Your Infrastructure

After defining your infrastructure in `index.ts`, the next step is to deploy it to Azure. This is done using the `pulumi up` command. When you run `pulumi up `, Pulumi performs several actions:
1. **Compilation**:  It compiles your Typescript code into JavaScript
2. **Plan Generation:** It compares the desired state defined in your code with the current state of your cloud resources(as recorded in the pulumi state file and by querying Azure). Based on this comparison, it generates a "plan" detailing the proposed changes (creations, updates, deletion).
3. **Preview**: it displays this plan to you for review. This preview shows exactly what actions Pulumi intends to take in your Azure subscription. 
4. **Confirmation**: it prompts you to confirm whether you want to proceed with the proposed changes. 
5. **Deployment**:  If you confirm, Pulumi executes the plan, making the necessary API calls to Azure to provision or update your resources. 
6. **State Update:** After the deployment, it updates the Pulumi state file with the actual state of your deployed resources.
7. **Output Display:** It displays any exported outputs from your Pulumi program. 

Before running `pulumi up`, ensure you are logged into Azure. Pulumi leverages your Azure CLI authentication, so if you have run `az login`, Pulumi will automatically use those credentials.

To deploy the resource group:

bash

```
pulumi up
```

You will see output similar to this:

javascript

```
Previewing update (dev):     Type                         Name                  Plan +   azure-native:resources:ResourceGroup  my-resource-group     createResources:    + 1 to createDo you want to perform this update? yes
```

Type `yes` and press Enter to proceed. Pulumi will then create the resource group in Azure.

Upon successful deployment, you will see output indicating the creation of the resource group and the exported outputs:

javascript

```
Updating (dev):     Type                         Name                  Status +   azure-native:resources:ResourceGroup  my-resource-group     createdOutputs:    resourceGroupId: "/subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/my-first-pulumi-rg"    resourceGroupName: "my-first-pulumi-rg"Resources:    + 1 createdDuration: 10sPermalink: https://app.pulumi.com/YOUR_PULUMI_ORG/my-azure-rg-project/dev/updates/1
```

You can verify the creation of the resource group by navigating to the Azure portal or using the Azure CLI:

bash

```
az group show --name my-first-pulumi-rg --output table
```
## Managing Your Project and Stacks

Pulumi manages different deployment environments through _stacks_. A stack is an isolated instance of your Pulumi program, each with its own state and configuration. This allows you to deploy the same infrastructure code to different environments (e.g., development, staging, production) without interference.

You can create new stacks using `pulumi stack init <stack-name>`. For example, to create a `staging` stack:

bash

```
pulumi stack init staging
```

To switch between stacks, use `pulumi stack select <stack-name>`. For instance, to switch back to the `dev` stack:

bash

```
pulumi stack select dev
```

Each stack can have its own configuration values. Configuration allows you to parameterize your infrastructure, making it more flexible. For example, you might want different resource group names or locations for different stacks. Pulumi configuration is managed using `pulumi config set <key> <value>`. This will be explored in more detail in a later module.

## Destroying Your Infrastructure

When you no longer need the resources deployed by a stack, you can destroy them using `pulumi destroy`. This command reverses the deployment process, removing all resources managed by the current stack from your cloud provider.

Similar to `pulumi up`, `pulumi destroy` first generates a plan showing all resources that will be deleted, prompts for confirmation, and then proceeds with the deletion.

To destroy the resource group created in the `dev` stack:

bash

```
pulumi destroy
```

You will see a preview of the resources to be deleted:

javascript

```
Previewing destroy (dev):     Type                         Name                  Plan -   azure-native:resources:ResourceGroup  my-resource-group     deleteResources:    - 1 to deleteDo you want to perform this destroy? yes
```

Type `yes` and press Enter to confirm the deletion. Pulumi will then remove the resource group from Azure.

javascript

```
Destroying (dev):     Type                         Name                  Status -   azure-native:resources:ResourceGroup  my-resource-group     deletedResources:    - 1 deletedDuration: 8sPermalink: https://app.pulumi.com/YOUR_PULUMI_ORG/my-azure-rg-project/dev/updates/2
```

After destruction, the resources are removed from Azure, but the stack's state file still exists. If you want to remove the stack completely, including its state file, you can use `pulumi stack rm`. This command should only be used _after_ `pulumi destroy` has successfully removed all resources, or if the stack was created but never deployed.

bash

```
pulumi stack rm dev
```

This will permanently delete the `dev` stack's state.