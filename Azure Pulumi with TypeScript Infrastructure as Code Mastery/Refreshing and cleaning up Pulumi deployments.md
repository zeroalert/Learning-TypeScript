Pulumi deployments, while robust, sometimes require adjustments or removal of resources. Understanding how to refresh the local state to match the cloud and how to completely clean up deployed infrastructure are essential skills for managing the lifecycle of your infrastructure as code. This involves synchronizing the Pulumi state with the actual cloud resources and responsibly deprovisioning resources no longer needed.

## Refreshing Pulumi Deployments

The `pulumi refresh` command is used to reconcile the local Pulumi state file with the actual state of resources in your cloud provider, in this case, Azure. This command performs a read-only scan of your cloud environment, comparing what's recorded in your stack's state file with what truly exists in Azure. If discrepancies are found, Pulumi updates the local state file to reflect the cloud's current reality without modifying any cloud resources.

Common scenarios where `pulumi refresh` is invaluable include:

- **Manual Resource Changes:** If a resource provisioned by Pulumi is manually modified outside of Pulumi (e.g., through the Azure portal, Azure CLI, or another IaC tool), the Pulumi state file will become out of sync. A refresh updates the state file to reflect these external changes. For instance, if you manually change the SKU of an Azure Storage Account from `Standard_LRS` to `Standard_GRS` directly in the Azure portal, running `pulumi refresh` will update Pulumi's state to acknowledge `Standard_GRS` without attempting to revert the change or apply a new one.
- **Drift Detection:** `refresh` acts as a powerful drift detection mechanism. It identifies any configuration drift between your Pulumi program's last known state and the current state of your cloud resources. While it doesn't _fix_ drift, it makes you aware of it.
- **State File Corruption:** In rare cases, a local state file might become corrupted or contain incorrect information. A refresh can help reconstruct an accurate state based on the live resources.
- **After Importing Resources:** Although we covered `pulumi import` in a previous lesson (Module 4, Lesson 5), a refresh after importing can confirm that the newly imported resource's state is accurately captured and synchronized.
- **Pre-Deployment Check:** Running a refresh before `pulumi up` can provide a clearer picture of potential changes, especially if team members might have made out-of-band modifications.

To perform a refresh, navigate to your Pulumi project directory in the terminal and execute:

```
pulumi refresh
```
Pulumi will then perform a preview, showing you what changes it will make _to the state file_. It will list resources that have changed attributes in Azure and indicate how the state file will be updated. You will be prompted to confirm the refresh.

### Example: Manual Change Detection

Consider an Azure Resource Group deployed with Pulumi:
```
// index.ts
import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";

const resourceGroup = new azure_native.resources.ResourceGroup("my-resource-group", {
    resourceGroupName: "my-pulumi-rg-001",
    location: "eastus",
    tags: {
        environment: "dev",
    },
});

export const resourceGroupName = resourceGroup.name;
```

After deploying this with `pulumi up`, assume you (or another team member) manually change the `environment` tag from `dev` to `qa` for the `my-pulumi-rg-001` resource group via the Azure portal.

Now, if you run `pulumi refresh`:
```
pulumi refresh
```
Pulumi will output a plan similar to this (simplified for clarity):
```
Previewing refresh (dev):

     Type                         Name                Old                  New
 =   azure-native:resources:ResourceGroup my-resource-group Tags.environment: "dev" -> "qa"

Resources:
    = 1 unchanged

Do you want to perform this refresh? yes
```

Upon confirmation, Pulumi will update its local state file to reflect that the `environment` tag for `my-pulumi-rg-001` is now `qa`, without making any changes in Azure. Your Pulumi program (`index.ts`) still defines the tag as `dev`. The next time you run `pulumi up`, Pulumi will detect this difference and propose changing the tag back to `dev` to align with your program's desired state.

## Cleaning Up Pulumi Deployments

Removing deployed infrastructure is a critical part of the lifecycle management, especially in dynamic development and testing environments, or when retiring old services. Pulumi provides the `pulumi destroy` command for this purpose. This command systematically deprovisions all resources managed by a specific Pulumi stack, deleting them from your cloud provider.

Before performing a destroy, Pulumi performs a preview, showing you exactly which resources will be deleted. This provides a crucial safety net, allowing you to review the planned destruction before it occurs.

### Understanding `pulumi destroy`

When you run `pulumi destroy`:

1. **State File Analysis:** Pulumi reads the current state file for the active stack.
2. **Deletion Plan:** It constructs a plan to delete all resources listed in the state file. Pulumi intelligently determines the correct order of deletion, respecting dependencies between resources (e.g., deleting a VM before the VNet it resides in, or deleting blobs before the storage container).
3. **Preview:** It presents this plan to you as a preview, detailing every resource that will be removed.
4. **Confirmation:** You are prompted to confirm the destruction. Only upon your explicit approval does Pulumi proceed with deleting resources from Azure.
5. **Resource Deletion:** Pulumi makes API calls to Azure to delete each resource according to the plan.
6. **State Update:** After successful deletion, Pulumi updates the state file to reflect that these resources no longer exist. If all resources are deleted, the state file effectively becomes empty for that stack.

### Example: Destroying Azure Resources

Using the same resource group example:

```
// index.ts
import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";

const resourceGroup = new azure_native.resources.ResourceGroup("my-resource-group", {
    resourceGroupName: "my-pulumi-rg-001",
    location: "eastus",
    tags: {
        environment: "dev",
    },
});

export const resourceGroupName = resourceGroup.name;
```

Assuming this stack has been deployed, to remove the `my-pulumi-rg-001` resource group from Azure, run:

```
Previewing destroy (dev):

     Type                         Name                Plan
 -   azure-native:resources:ResourceGroup my-resource-group destroy

Resources:
    - 1 to delete

Do you want to perform this destroy? yes
```

Upon typing `yes` and pressing Enter, Pulumi will proceed to delete the `my-pulumi-rg-001` resource group and any resources contained within it (if you had defined more resources in your program, they would also be listed and destroyed).

### Important Considerations for `pulumi destroy`

- **Irreversibility:** `pulumi destroy` is a destructive operation. Once confirmed, resources are permanently deleted from Azure. Always exercise caution and ensure you are targeting the correct stack and environment.
- **Dependencies:** Pulumi manages resource dependencies during destruction. If a resource cannot be deleted because of an external dependency not managed by Pulumi, the operation might fail for that specific resource.
- **Stack-Specific:** `pulumi destroy` only affects resources managed by the currently active Pulumi stack. If you have multiple stacks (e.g., `dev`, `staging`, `prod`), destroying one will not affect the others. This reinforces the importance of using stacks for different environments, as discussed in a previous lesson (Module 4, Lesson 4).
- **Force Deletion:** In rare cases, a resource might get stuck in a state where it cannot be deleted normally. While not recommended for regular use, some cloud providers offer "force delete" options for certain resources. Pulumi's `destroy` command generally relies on standard API calls. If issues persist, manual intervention in Azure might be required, followed by another `pulumi destroy` or `pulumi refresh` to synchronize the state.
- **Retained State:** Even after a successful `pulumi destroy`, the stack's state file (especially when using the Pulumi Service backend) might still exist, albeit in an empty or nearly empty state. You can completely remove a stack, including its history and state file, using `pulumi stack rm <stack-name>`. Be extremely cautious with this command as it erases all historical data for the stack.