Pulumi components provide a powerful mechanism for encapsulating and abstracting infrastructure configurations into reusable units. These components allow you to define higher-level abstractions that combine multiple primitive resources, offering a more organized and manageable way to build and scale your infrastructure. By creating custom components, you reduce boilerplate code, promote consistency across your projects, and enable teams to consume predefined infrastructure patterns without needing to understand the underlying complexities. This approach aligns with the principles of modularity and reusability, essential for maintaining large and complex cloud environments.

## Understanding Pulumi Components

Pulumi components are essentially classes that extend `pulumi.ComponentResource`. They allow you to group related resources and logic into a single, cohesive unit. This is particularly useful when you have a common set of resources that are deployed together repeatedly, such as a web application stack (load balancer, web server, database), a network segment (VPC, subnets, routing tables), or a monitoring solution.

### Anatomy of a Pulumi Component

A Pulumi component in TypeScript typically involves:

1. **Extending `pulumi.ComponentResource`:** This is the base class for all custom components.
2. **Constructor:** The constructor takes a unique name for the component instance and optionally a `pulumi.ResourceOptions` object. Inside the constructor, you define and create the child resources that form the component.
3. **Output Properties:** Components can expose specific properties of their internal resources as outputs, allowing consuming stacks to interact with or retrieve information about the created infrastructure.

### Basic Component Example: A Simple Azure Storage Account Wrapper

Consider a scenario where you frequently need to deploy Azure Storage Accounts with a specific set of configurations, such as a standard redundancy and a blob container for logs.

``` typescript
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

        const storageAccountName = pulumi.interpolate`${args.namePrefix}${name.toLowerCase().replace(/[^a-z0-9]/g, ``)}${this.urn.apply(urn => urn.split("::").pop()?.substring(0, 8).toLowerCase() || ``)}`; // wtf

  

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
```
In this example:

- `StorageAccountComponentArgs` defines the inputs required for our component.
- `StandardStorageAccount` extends `pulumi.ComponentResource`.
- The constructor creates a `StorageAccount` and a `BlobContainer`.
- `{ parent: this }` is crucial; it establishes a parent-child relationship in the Pulumi state, making the internal resources part of the component.
- `this.registerOutputs()` makes `storageAccountName` and `primaryBlobEndpoint` accessible to consumers of this component.
- Forgot the Export aspect
### Consuming the Component

Now, to use this component in your main Pulumi program:

``` typescript 
import * as azure from "@pulumi/azure";

import * as azure_native from "@pulumi/azure-native";

import { tenantId } from "@pulumi/azure/config";

import { StandardStorageAccount } from "./StandardStorageAccount"; // Assuming the component is in this file

import * as pulumi from "@pulumi/pulumi";


// Deploy two instances of our custom storage account component

const webappStorage = new StandardStorageAccount("webAppStorage",{

  resourceGroupName: resourceGroup.name,

  location: resourceGroup.location,

  namePrefix: "webaaplogs", // Example Prefix

}, {dependsOn: [resourceGroup]});

  

const databaseBackupStorage = new StandardStorageAccount("dbBackupStorage",{

  resourceGroupName: resourceGroup.name,

  location: resourceGroup.location,

  namePrefix: "dbbkup", // Example Prefix

}, { dependsOn: [resourceGroup]});

  

export const webAppStorageName = webappStorage.storageAccountName;

export const webAppBlobEndpoint = webappStorage.primaryBlobEndpoint;

export const dbBackupStorageName = databaseBackupStorage.storageAccountName;

export const dbBackupBlobEndpoint = databaseBackupStorage.primaryBlobEndpoint;

```
This demonstrates how two distinct `StandardStorageAccount` instances are created, each deploying a storage account and a log container with consistent configurations, but with unique names and managed independently by Pulumi.

## Designing and Implementing Modular Pulumi Architectures

Modular architecture with Pulumi goes beyond just creating components; it involves structuring your projects and components in a way that promotes clarity, testability, and scalability. This often means breaking down your infrastructure into logical layers or domains.

### Layered Architecture Example: Web Application Stack

A common pattern is to organize infrastructure into layers: Networking, Database, Application, and Monitoring. Each layer can be represented by one or more Pulumi components.

Consider building a three-tier web application:

- **Network Layer:** Virtual Network, Subnets, Network Security Groups.
- **Database Layer:** Azure SQL Database, Private Endpoints.
- **Application Layer:** Azure App Service Plan, App Service.

#### Step 1: Network Component

First, define a component for the core networking infrastructure.
``` typescript
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
```

#### Step 2: Database Component

Next, create a component for the Azure SQL Database. This component will require the database subnet ID from the network component.

``` typescript
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

     *  The admin password for the SQL Server

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
```

#### Step 3: Application Component

Finally, create a component for the Azure App Service. This component will need the application subnet ID.

``` typescript
// application/AppServiceComponent.ts

import * as pulumi from "@pulumi/pulumi";

import * as azure_native from "@pulumi/azure-native";

  

interface AppServiceComponentArgs {

    /**

     *  The name of the resource group.

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
```

This layered approach demonstrates:

- **Separation of Concerns:** Each component manages a specific domain of infrastructure.
- **Dependency Management:** Components explicitly declare dependencies using `dependsOn` and pass outputs from one component as inputs to another.
- **Clear Interfaces:** Each component exposes a well-defined set of inputs (`ComponentArgs`) and outputs, making them easy to understand and use.
- **Organization:** Files are organized into logical directories (`network`, `database`, `application`).

This modular design significantly improves maintainability and allows different teams to work on specific parts of the infrastructure without interfering with others, or for a single team to manage complexity more effectively.

## Exercises

### Exercise 1: Extending the Standard Storage Account Component

Modify the `StandardStorageAccount` component to optionally create a secondary blob container with a configurable name.

1. **Update `StorageAccountComponentArgs`:** Add an optional `secondaryContainerName?: string;` property.
2. **Modify the constructor:** Inside the `StandardStorageAccount` constructor, if `args.secondaryContainerName` is provided, create another `azure_native.storage.BlobContainer` with that name.
3. **Add output (optional):** If you create the secondary container, you might want to expose its name or URL as an output.
4. **Test:** Update your `index.ts` to deploy one instance of `StandardStorageAccount` without the secondary container and another with it.

### Exercise 2: Building a Simple Azure Function Component

Create a new Pulumi component named `AzureFunctionApp` that encapsulates the deployment of an Azure Function App. This component should:

1. Create an Azure Storage Account (you can reuse `StandardStorageAccount` or create a simple one inline). Azure Functions require a storage account.
2. Create an Azure App Service Plan suitable for Azure Functions (e.g., Consumption plan).
3. Create the Azure Function App itself, linking it to the storage account and App Service Plan.
4. Expose the Function App's default hostname as an output.
5. **Bonus:** Add an input for `appSettings` to allow configuring environment variables for the function app.

typescript

```
// Hint for Exercise 2 structure:

// azure-function/FunctionAppComponent.ts

import * as pulumi from "@pulumi/pulumi";

import * as azure_native from "@pulumi/azure-native";

// ... (define interface and class)

export class AzureFunctionApp extends pulumi.ComponentResource {

    // ... constructor

}

  

// In index.ts:

// const myFunctionApp = new AzureFunctionApp("myFunction", { ... });

// export const functionAppUrl = myFunctionApp.defaultHostName;
```