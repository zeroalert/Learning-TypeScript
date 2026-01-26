import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";

interface StorageAccountComponentsArgs {
	/** 
	 * The name of the resource group to deploy the storage account into. 
	*/
	resourceGroupName: pulumi.Input<string>;
    		/** 
	 * The location for the storage account.
	*/
    location: pulumi.Input<string>;
		/** 
	 * A prefix for the storage account name. A unique suffix will be added. 
	*/
    namePrefix: string;
}

// Create a class?
export class StandardStorageAccount extends pulumi.ComponentResource {
    public readonly storageAccountName: pulumi.Output<string>;
    public readonly primaryBlobEndpoint: pulumi.Output<string>;

    constructor(
        name: string,
        args: StorageAccountComponentsArgs,
        opts?: pulumi.ComponentResourceOptions
    ) {
        super("custom:azure:StandardStorageAccount", name, args, opts);

        // Generate a unique name for the storage account to avoid conflicts.
        // args.namePrefix > your custom prefix
        // name.toLowerCase().replace(/[^a-z0-9]/g, ``) -> forces azure-legal chars only (lowercase + numbers)
        // pulumi.interoplate --> safely comibes outputs + strings 
        const randomSuffix = Math.random().toString(36).substring(2, 10);
        const storageAccountName = `${args.namePrefix}${randomSuffix}`.substring(0, 24);
        // Create the Azure storage 
        const storageAccount = new azure_native.storage.StorageAccount(`${name}-sa`,{
            resourceGroupName: args.resourceGroupName,
            location: args.location,
            accountName: storageAccountName,
            sku: {
                name: azure_native.storage.SkuName.Standard_LRS, // Standard Locally-Redundant Storage
            },
            kind: azure_native.storage.Kind.StorageV2, // General-purpose v2 storage
        }, {parent: this}); // Important: set the parent associate with this component
        // Expose useful outputs from the component 
        this.storageAccountName = storageAccount.name;
        this.primaryBlobEndpoint = storageAccount.primaryEndpoints.apply(endpoints => endpoints?.blob || "")

        this.registerOutputs({
            storageAccountName: this.storageAccountName,
            primaryBlobEndpoint: this.primaryBlobEndpoint,

        });
    }
}


