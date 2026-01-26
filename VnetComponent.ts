// network/VnetComponent.ts
import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";
import { VirtualNetwork } from "@pulumi/azure-native/azurestackhci";

interface VnetComponentArgs {
    /**
     * The name of the resource group
     */
    resourceGroupName: pulumi.Input<string>;
    /**
     * The location for the virtual network
     */
    location: pulumi.Input<string>;
    /**
     * The address space for the virtual network.
     */
    vnetAddressSpace: pulumi.Input<string[]>;
    /**
     * The address prefix for the application subnet.
     */
    appSubnetAddressPrefix: pulumi.Input<string>;
    /**
     * The address prefix for the database subnet
     */
    dbSubnetAddressPrefix: pulumi.Input<string>;
}

export class VnetComponent extends pulumi.ComponentResource {
    public readonly vnetName: pulumi.Output<string>;
    public readonly appSubnetId: pulumi.Output<string>;
    public readonly dbSubnetId: pulumi.Output<string>;

    constructor(
        name: string,
        args: VnetComponentArgs,
        opts?: pulumi.ComponentResourceOptions
    ) {
        super("custom:azure:VnetComponent", name, args, opts);

        const vnetName = pulumi.interpolate`${name}-vnet`;

        const virtualNetwork = new azure_native.network.VirtualNetwork(`${name}-vnet`,{
            resourceGroupName: args.resourceGroupName,
            virtualNetworkName: vnetName,
            addressSpace: {
                addressPrefixes: args.vnetAddressSpace,
            },
        }, { parent: this});
        
        const appSubnet = new azure_native.network.Subnet(`${name}-app-subnet`,{
            resourceGroupName: args.resourceGroupName,
            virtualNetworkName: vnetName,
            subnetName: `${name}-app-subnet`,
            addressPrefix: args.appSubnetAddressPrefix,
        }, { parent: this, dependsOn: [virtualNetwork] });

        const dbSubnet = new azure_native.network.Subnet(`${name}-db-subnet`,{
            resourceGroupName: args.resourceGroupName,
            virtualNetworkName: vnetName,
            subnetName: `${name}-db-subnet`,
            addressPrefix: args.dbSubnetAddressPrefix,
        }, { parent: this, dependsOn: [virtualNetwork]});

        this.vnetName = virtualNetwork.name;
        this.appSubnetId = appSubnet.id;
        this.dbSubnetId = dbSubnet.id;

        this.registerOutputs({
            vnetName: this.vnetName,
            appSubnetId: this.appSubnetId,
            dbSubnetId: this.dbSubnetId,
        });
    }
}