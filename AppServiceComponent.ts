// application/AppServiceComponent.ts
import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";

interface AppServiceComponentArgs {
    /**
     *  The name of the resource group.
     */
    resourceGroupName: pulumi.Input<string>;
    /**
     * The location for the app service
     */
    location: pulumi.Input<string>;
    /**
     * The subnet ID for VNet integration
     */
    subnetId: pulumi.Input<string>;
    /**
     * Applciation settings for the App Service
     */
    appSetting?: pulumi.Input<{[key: string]: pulumi.Input<string>}>;
}

export class AppServiceComponent extends pulumi.ComponentResource {
    public readonly appServiceName: pulumi.Output<string>;
    public readonly defaultHostName: pulumi.Output<string>;
    
    constructor(
        name: string,
        args: AppServiceComponentArgs,
        opts?: pulumi.ComponentResourceOptions
    ) {
        super("custom:azure:AppServiceComponent", name, args, opts);

        const appServicePlan = new azure_native.web.AppServicePlan(`${name}-appplan`,{
            resourceGroupName: args.resourceGroupName,
            location: args.location,
            kind: "Linux",
            sku: {
                name: "B1", // 
            },
            reserved: true, 
        }, { parent: this });

        const appService = new azure_native.web.WebApp (`${name}-appservice`,{
            resourceGroupName: args.resourceGroupName,
            location: args.location,
            serverFarmId: appServicePlan.id,
            siteConfig: {
                appSettings: args.appSetting ? Object.entries(args.appSetting).map(([name, value]) => ({ name, value})) : undefined,
                linuxFxVersion: "NODE|18-LTS",
            },
            httpsOnly: true, 
        }, { parent: this, dependsOn: [appServicePlan]});

        // VNet Integration 
        const vnetIntegration = new azure_native.web.WebAppVnetConnection(`${name}-vnet-conn`,{
            name: appService.name,
            resourceGroupName: args.resourceGroupName,
            vnetName: pulumi.interpolate`${name}-vnet-connection`,
            vnetResourceId: pulumi.output(args.subnetId).apply(id => id.split("/subnets")[0]), // This ensures args.subnetId is converted to an Output<string> before calling .apply().
        }, { parent: this, dependsOn: [appService] });

        this.appServiceName = appService.name;
        this.defaultHostName = appService.defaultHostName;

        this.registerOutputs({
            appServiceName: this.appServiceName,
            defaultHostName: this.defaultHostName,
        });
    }
}

