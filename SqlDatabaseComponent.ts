// database/SqlDatabaseComponent.ts
import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";

interface SqlDatabaseComponentArgs {
    /**
     * The name of the resource group.
     */
    resourecGroupName: pulumi.Input<string>;
    /**
     * The location for the database.
     */
    location: pulumi.Input<string>;
    /**
     * The subnet ID for the private endpoint. 
     */
    subnetId: pulumi.Input<string>;
    /**
     * The admin login for the SQL Server.
     */
    adminLogin: pulumi.Input<string>;
    /**
     *  The admin password for the SQL Server
     */
    adminPassword: pulumi.Input<string>;
}

export class SqlDatabaseComponent extends pulumi.ComponentResource {
    public readonly serverName: pulumi.Output<string>;
    public readonly databaseName: pulumi.Output<string>;
    public readonly privateEndpointName: pulumi.Output<string>;

    constructor(
        name: string,
        args: SqlDatabaseComponentArgs,
        opts?: pulumi.ComponentResourceOptions
    )
    {
        super("custom:azure:SqlDatabaseComponent", name, args, opts);

        const sqlServer = new azure_native.sql.Server(`${name}-sqlserver`, {
            resourceGroupName: args.resourecGroupName,
            location: args.location,
            serverName: pulumi.interpolate`${name}-sqlserver`,
            administratorLogin: args.adminLogin,
            administratorLoginPassword: args.adminPassword,
            version: "12.0", // SQL Server 2019 compatible version
        }, { parent: this});
        
        const sqlDatabase = new azure_native.sql.Database(`${name}-sqldb`, {
            resourceGroupName: args.resourecGroupName,
            location: args.location,
            serverName: sqlServer.name,
            databaseName: pulumi.interpolate`${name}-db`,
            sku: {
                name: "Standard",
                tier: "Standard",
            }
        }, { parent: this, dependsOn: [sqlServer]});

        const privateEndpoint = new azure_native.network.PrivateEndpoint(`${name}-pe`,{
            resourceGroupName: args.resourecGroupName,
            location: args.location,
            subnet: {
                id: args.subnetId, // Connect to the database subnet
            },
            privateLinkServiceConnections: [{
                name: pulumi.interpolate`${name}-sql-plsc`,
                privateLinkServiceId: sqlServer.id,
                groupIds: ["sqlServer"], // Target the SQL Server service 
            }],
        }, { parent: this, dependsOn: [sqlServer, ] }); // Pulumi automatically tracks the dependency because you're already using args.subnetId in the subnet.id property on line 65. Explicit dependsOn is only needed for resources, not for string IDs.

        this.serverName = sqlServer.name;
        this.databaseName = sqlDatabase.name;
        this.privateEndpointName = privateEndpoint.name;

        this.registerOutputs({
            serverName: this.serverName,
            databaseName: this.databaseName,
            privateEndpointName: this.privateEndpointName,
        })

    }
}