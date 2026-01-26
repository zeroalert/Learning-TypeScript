Existing Azure resources often need to be managed by Infrastructure as Code (IaC) tools like Pulumi after they have been manually provisioned or deployed through other means. The `pulumi import` command facilitates this process, allowing Pulumi to take ownership of resources already present in Azure, integrating them into the Pulumi state, and subsequently enabling their management via Pulumi programs. This capability is critical for adopting Pulumi in environments with existing infrastructure, preventing the need to destroy and recreate resources.

## Understanding the Pulumi Import Process

Importing an existing resource involves instructing Pulumi to recognize and track a resource that already exists in your cloud provider, in this case, Azure. The core idea is to tell Pulumi: "This resource is already here, and I want you to manage it from now on using this specific code definition."

The import operation generally follows these steps:

1. **Define the Resource in Code:** You write a Pulumi program (in TypeScript for this course) that describes the desired state of the existing resource. This definition must accurately match the resource's current configuration in Azure.
2. **Identify the Resource's ID:** You need the unique Azure Resource ID (ARM ID) of the resource you wish to import. This ID acts as the bridge between your Pulumi code and the actual resource in Azure.
3. **Execute the Import Command:** You run a specific Pulumi CLI command, `pulumi import`, providing it with the Pulumi URN (Unique Resource Name) you've given the resource in your code and its Azure Resource ID.
4. **Review the Plan:** Pulumi performs a `preview` operation as part of the import. It shows what changes it _would_ make to synchronize the existing resource with your code, or if no changes are needed.
5. **Confirm the Import:** You confirm the import, and Pulumi updates its state file to include the imported resource, marking it as managed.

It is crucial that the resource definition in your Pulumi code precisely matches the existing resource's configuration in Azure. If there are discrepancies, Pulumi might propose changes to align the existing resource with your code during the import preview. If these changes are undesirable, you must adjust your code to match the existing state before proceeding with the import.

### Resource ID vs. Pulumi URN

- **Azure Resource ID (ARM ID):** This is the unique identifier assigned by Azure to every resource. It typically follows a pattern like `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{resourceProvider}/{resourceType}/{resourceName}`. You can find this in the Azure portal on the resource's "Overview" blade or by using Azure CLI/PowerShell.
- **Pulumi URN (Unique Resource Name):** This is Pulumi's internal identifier for a resource within a stack. It is composed of the project name, stack name, resource type, and resource name you define in your Pulumi code. For example, `urn:pulumi:my-project::dev::azure-native:resources:ResourceGroup::my-resource-group`. When importing, you specify the _name_ you give the resource in your code, and Pulumi constructs the URN.

## Practical Steps for Importing Azure Resources

Let's walk through importing an existing Azure Resource Group. Suppose you have an existing Resource Group named `my-existing-rg` in Azure.

### Step 1: Create a New Pulumi Project (if needed)

If you don't have an existing Pulumi project where you want to import the resource, create one:

```
pulumi new azure-typescript --name my-import-project
```
Navigate into the new project directory.

### Step 2: Define the Resource in TypeScript

Open `index.ts` and add the definition for the existing Resource Group. The important part here is that the _name_ specified in your Pulumi program (e.g., `"my-imported-resource-group"`) will be used to generate the Pulumi URN. The actual name of the resource _in Azure_ (`my-existing-rg`) is passed to the resource constructor.

```
import * as azure_native from "@pulumi/azure-native";

// Define the existing Azure Resource Group.
// The name "my-imported-resource-group" is the logical name Pulumi will use internally.
// The 'resourceGroupName' property must match the actual name of the resource group in Azure.
const importedResourceGroup = new azure_native.resources.ResourceGroup("my-imported-resource-group", {
    resourceGroupName: "my-existing-rg", // This *must* match the actual name in Azure
    location: "West US", // This *must* match the actual location in Azure
});

// Optionally, export the name or ID if you want to see it in the Pulumi stack outputs
export const resourceGroupName = importedResourceGroup.name;
export const resourceGroupId = importedResourceGroup.id;
```

**Important:** The `location` property (and any other properties you add later, like tags) **must** accurately reflect the current state of the existing Azure resource. If there's a mismatch, Pulumi will show a diff during the import preview.

### Step 3: Find the Azure Resource ID

You need the full Azure Resource ID for `my-existing-rg`. You can get this from the Azure portal or using Azure CLI:

```
az group show --name my-existing-rg --query id -o tsv
```

This will output something like: `/subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/my-existing-rg`

### Step 4: Execute the Pulumi Import Command

Now, run the import command. The format is `pulumi import <Pulumi_resource_name_in_code> <Azure_resource_ID>`.

The `<Pulumi_resource_name_in_code>` is the string you used when creating the resource instance in TypeScript, which was `"my-imported-resource-group"`.

```
pulumi import azure-native:resources:ResourceGroup my-imported-resource-group /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/my-existing-rg
```

```
Previewing import (dev):

     Type                               Name                       Plan
 +   pulumi:pulumi:Stack                my-import-project-dev      create
 +   azure-native:resources:ResourceGroup my-imported-resource-group import

Resources:
    + 2 to import
```

If there are any differences between your code's definition and the existing resource, Pulumi will show a diff. For example, if you specified `location: "East US"` in your code but the existing resource group is in `West US`, Pulumi would show a planned update to change the location. You would need to decide whether to:

1. Proceed with the import and allow Pulumi to update the resource's location.
2. Stop the import, modify your `index.ts` to match the existing `location: "West US"`, and then retry the import.

### Step 5: Confirm the Import

If the preview looks correct, confirm the import:

```
pulumi import azure-native:resources:ResourceGroup my-imported-resource-group /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/my-existing-rg --yes
```

After successful completion, Pulumi's state file will be updated, and the `my-existing-rg` Resource Group will now be managed by your Pulumi program. You can then run `pulumi up` to make any desired changes to it through your code or `pulumi refresh` to synchronize the state.

## Importing Dependent Resources

The process extends to resources that depend on others. Suppose you have an existing Storage Account (`myexistingstorage`) within `my-existing-rg`.

### Step 1: Update TypeScript Code

Modify `index.ts` to include the definition for the Storage Account. It will implicitly depend on the imported Resource Group.

```
import * as azure_native from "@pulumi/azure-native";

const importedResourceGroup = new azure_native.resources.ResourceGroup("my-imported-resource-group", {
    resourceGroupName: "my-existing-rg",
    location: "West US",
});

const importedStorageAccount = new azure_native.storage.StorageAccount("my-imported-storage-account", {
    resourceGroupName: importedResourceGroup.name, // Reference the imported RG
    accountName: "myexistingstorage", // Actual name of the storage account in Azure
    location: importedResourceGroup.location,
    sku: {
        name: azure_native.storage.SkuName.Standard_LRS, // Must match existing SKU
    },
    kind: azure_native.storage.Kind.StorageV2, // Must match existing Kind
});

export const resourceGroupName = importedResourceGroup.name;
export const storageAccountName = importedStorageAccount.name;
```

### Step 2: Find the Storage Account's Azure Resource ID
```
az storage account show --name myexistingstorage --resource-group my-existing-rg --query id -o tsv
```

This will output something like: `/subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/my-existing-rg/providers/Microsoft.Storage/storageAccounts/myexistingstorage`
```
pulumi import azure-native:storage:StorageAccount my-imported-storage-account /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/my-existing-rg/providers/Microsoft.Storage/storageAccounts/myexistingstorage --yes
```
### Step 3: Execute the Pulumi Import Command
```
pulumi import azure-native:storage:StorageAccount my-imported-storage-account /subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/my-existing-rg/providers/Microsoft.Storage/storageAccounts/myexistingstorage --yes
```
Now, both the Resource Group and the Storage Account are managed by Pulumi. If you run `pulumi up`, Pulumi will calculate any diffs and apply them if your code has diverged from the live state, or it will report "no changes" if they are in sync.

```
import * as azure_native from "@pulumi/azure-native";

// Assume importedResourceGroup is already defined and imported.
const importedResourceGroup = new azure_native.resources.ResourceGroup("my-imported-resource-group", {
    resourceGroupName: "my-existing-rg",
    location: "West US",
});

// Define the existing VNet
const productionVnet = new azure_native.network.VirtualNetwork("production-vnet", {
    resourceGroupName: importedResourceGroup.name,
    virtualNetworkName: "production-vnet", // Actual name in Azure
    location: importedResourceGroup.location,
    addressSpace: {
        addressPrefixes: ["10.0.0.0/16"], // Must match existing
    },
});

// Define the existing Subnet within the VNet
const defaultSubnet = new azure_native.network.Subnet("default-subnet", {
    resourceGroupName: importedResourceGroup.name,
    virtualNetworkName: productionVnet.name,
    subnetName: "default-subnet", // Actual name in Azure
    addressPrefix: "10.0.1.0/24", // Must match existing
});

export const vnetName = productionVnet.name;
export const subnetName = defaultSubnet.name;
```

