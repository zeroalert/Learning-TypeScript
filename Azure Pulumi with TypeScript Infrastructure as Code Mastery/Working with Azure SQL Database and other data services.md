This lesson focuses on deploying and managing Azure SQL Databases and other essential Azure data services using Pulumi and TypeScript. These services are fundamental for applications requiring robust data storage, whether relational, NoSQL, or analytical. Understanding how to provision and configure these resources programmatically is a core skill for building data-driven cloud solutions.

## Deploying Azure SQL Database

Azure SQL Database is a fully managed platform-as-a-service (PaaS) database engine that handles most of the database management functions such as upgrading, patching, backups, and monitoring without user involvement. When deploying an Azure SQL Database with Pulumi, the process typically involves provisioning an Azure SQL Server and then creating databases within that server.

### Provisioning an Azure SQL Server

An Azure SQL Server acts as a logical container for one or more databases. It provides a central administrative point for managing security, logins, firewall rules, and more.

``` typescript
import * as azure from "@pulumi/azure-native";

// Assume an existing resource group or create a new one as shown in previous lessons
const resourceGroup = new azure.resources.ResourceGroup("my-sql-rg", {
    resourceGroupName: "my-sql-database-rg",
    location: "East US", // Choose an appropriate Azure region
});

// Create an Azure SQL Server

const sqlServer = new azure_native.sql.Server("my-sql-server",{

  resourceGroupName: resourceGroup.name,

  serverName: "myserver-pulumi-demo",

  location: resourceGroup.location,

  version: "12.0",

  administratorLogin: "pulumiadmin",

  administratorLoginPassword: "StrongPassword!123",

  tags: {

    environment: "dev",

    project: "pulumi-sql",

  }

});

  

// Configure a firewall rule to allow azure services to access the server

const azureServicesFirewallRule = new azure_native.sql.FirewallRule("azure-services-rule",{

  resourceGroupName: resourceGroup.name,

  serverName: sqlServer.name,

  firewallRuleName: "AllowMyIP",

  startIpAddress: "203.0.113.10",

  endIpAddress: "203.0.113.10",

})

// Another firewall rule to allow access from a specific IP range (e.g., your development machine)
const myIpFirewallRule = new azure.sql.FirewallRule("my-ip-rule", {
    resourceGroupName: resourceGroup.name,
    serverName: sqlServer.name,
    firewallRuleName: "AllowMyIP",
    startIpAddress: "203.0.113.10", // Replace with your actual public IP address or range
    endIpAddress: "203.0.113.10",
});

export const sqlServerName = sqlServer.name;
export const sqlServerFullyQualifiedDomainName = sqlServer.fullyQualifiedDomainName;
```

This code creates a SQL Server, which is a logical entity. It also demonstrates how to configure firewall rules to control access to the server. The `0.0.0.0` to `0.0.0.0` IP range for firewall rules is a special value in Azure SQL that allows other Azure services to connect to the SQL Server. This is commonly used when an Azure App Service or Azure Function needs to access the database. For specific client access, a more targeted IP address or range is provided.

### Creating an Azure SQL Database

Once a SQL Server is provisioned, you can create one or more databases within it. Each database can have its own service tier and performance level (DTUs or vCores).

``` typescript
import * as azure from "@pulumi/azure-native";

// ... (previous resource group and sqlServer creation) ...

// Create an Azure SQL Database within the server
const sqlDatabase = new azure_native.sql.Database("my-sql-database", {
    resourceGroupName: resourceGroup.name,
    serverName: sqlServer.name,
    databaseName: "pulumi-app-db",
    location: resourceGroup.location,
    sku: {
        name: "S0", // Standard S0 tier. Other options include Basic, GeneralPurpose, BusinessCritical
        tier: "Standard",
        capacity: 10, // DTU capacity for S0. For vCore tiers, this would be vCores.
    },
    collation: "SQL_Latin1_General_CP1_CI_AS", // Collation defines rules for sorting and comparison
    maxSizeBytes: 268435456000, // Maximum size in bytes (e.g., 250 GB)
});

export const sqlDatabaseName = sqlDatabase.name;
export const sqlDatabaseId = sqlDatabase.id;
```

This example creates a database named `pulumi-app-db` with the `S0` service objective. The `sku` property specifies the performance tier and capacity. `S0` is a general-purpose tier suitable for many applications, while `GeneralPurpose` and `BusinessCritical` are vCore-based tiers offering more granular control over compute and storage, often used for more demanding workloads. The `collation` defines character set and sorting rules, which is important for multi-lingual applications or specific data processing requirements.

## Working with Azure Cosmos DB

Azure Cosmos DB is a globally distributed, multi-model database service that offers turn-key global distribution, elastic scaling of throughput and storage, and guaranteed low-latency access. It supports various APIs, including SQL (Core), MongoDB, Cassandra, Gremlin, and Table.


### Provisioning an Azure Cosmos DB Account

The first step is to create a Cosmos DB account, which serves as a container for your databases and collections/containers.

``` typescript
import * as azure from "@pulumi/azure-native";


// Create an Azure Cosmos DB Account
const cosmosdbAccount = new azure_native.cosmosdb.DatabaseAccount("my-cosmosdb-account", {
    resourceGroupName: resourceGroup.name,
    accountName: "mypulumi-cosmosdb-acc", // Cosmos DB account names must be globally unique
    location: resourceGroup.location,
    databaseAccountOfferType: "Standard", // The offer type for the Cosmos DB database account. "Standard" is common.
    // Specify the API type. Options: "Core (SQL)", "MongoDB", "Cassandra", "Gremlin", "Table"
    capabilities: [
        { name: "EnableCassandra" }, // Example: Enable Cassandra API
        // { name: "EnableGremlin" },
        // { name: "EnableMongo" },
        // { name: "EnableTable" },
    ],
    // Consistency policy defines how data consistency is managed across regions.
    // Options: BoundedStaleness, ConsistentPrefix, Eventual, Session, Strong
    consistencyPolicy: {
        defaultConsistencyLevel: "Session",
    },
    // Geo-replication settings
    locations: [
        {
            locationName: resourceGroup.location,
            failoverPriority: 0, // 0 is primary read/write region
        },
        {
            locationName: "East US", // Adding a second region for global distribution and failover
            failoverPriority: 1,
        },
    ],
    tags: {
        environment: "dev",
        project: "pulumi-cosmosdb",
    },
});

export const cosmosdbAccountName = cosmosdbAccount.name;
export const cosmosdbEndpoint = cosmosdbAccount.documentEndpoint;
```

### Creating a Cosmos DB SQL API Database and Container

Once the account is ready, you can create specific databases and containers (collections) within it. This example focuses on the SQL (Core) API.

``` typescript 
import * as azure from "@pulumi/azure-native";

// ... (previous resource group and cosmosdbAccount creation) ...

// Create a Cosmos DB SQL API Database
const cosmosdbSqlDatabase = new azure.documentdb.SqlResourceSqlDatabase("my-sql-database-cosmos", {
    resourceGroupName: resourceGroup.name,
    accountName: cosmosdbAccount.name,
    databaseName: "ProductCatalog",
    // Throughput settings for the database. Either specify `resource.throughput` or `autoscaleSettings`.
    // autoscaleSettings: { maxThroughput: 4000 },
    resource: { id: "ProductCatalog" },
    options: { throughput: 400 }, // Manually provisioned throughput in RUs (Request Units)
});

// Create a Cosmos DB SQL API Container (equivalent to a collection or table)
const cosmosdbSqlContainer = new azure.documentdb.SqlResourceSqlContainer("my-sql-container", {
    resourceGroupName: resourceGroup.name,
    accountName: cosmosdbAccount.name,
    databaseName: cosmosdbSqlDatabase.name,
    containerName: "Products",
    resource: {
        id: "Products",
        partitionKey: {
            paths: ["/category"], // Define the partition key for efficient querying and scaling
            kind: "Hash",
        },
    },
    options: {
        throughput: 400, // Manually provisioned throughput for the container
    },
    // Indexing policy to optimize queries
    indexingPolicy: {
        indexingMode: "Consistent",
        includedPaths: [{ path: "/*" }], // Index all paths by default
        excludedPaths: [{ path: "/_etag/?" }], // Exclude internal system properties
    },
});

export const cosmosdbSqlDatabaseName = cosmosdbSqlDatabase.name;
export const cosmosdbSqlContainerName = cosmosdbSqlContainer.name;
```

## Integrating Azure Cache for Redis

Azure Cache for Redis provides an in-memory data store based on the open-source Redis. It is used to improve the performance and scalability of applications that rely heavily on backend data stores. It does this by caching frequently accessed data in memory, reducing the load on the primary database.

### Deploying an Azure Cache for Redis Instance
``` typescript
import * as azure from "@pulumi/azure-native";

// Assume an existing resource group
const resourceGroup = new azure.resources.ResourceGroup("my-redis-rg", {
    resourceGroupName: "my-redis-cache-rg",
    location: "East US",
});

// Create an Azure Redis Instance

const redisCache = new azure_native.redis.Redis("my-redis-cache",{

  resourceGroupName: resourceGroup.name,

  name: "pulumi-redis-cache",

  location: resourceGroup.location,

  sku: {

    name: "Standard",

    family: "C",

    capacity: 1,

  },

  minimumTlsVersion: "1.2",

  enableNonSslPort: false,

  tags: {

    environment: "dev",

    purpose: "caching",

  }

});

export const redisCacheHostname = redisCache.hostname;
export const redisCachePrimaryConnectionString = redisCache.primaryConnectionString;
```

This code provisions a `Standard C1` Azure Cache for Redis instance. The `sku` property determines the cache size and features. `Standard` tier offers higher availability compared to `Basic`. `Premium` tier adds more advanced features like VNet integration, clustering, and data persistence. It's good practice to set `minimumTlsVersion` to `1.2` and `enableNonSslPort` to `false` for enhanced security.

## Best Practices for Data Service Deployments

When deploying data services with Pulumi, several best practices ensure security, scalability, and maintainability.

- **Secret Management**: Database passwords and connection strings are sensitive. Storing them directly in Pulumi code, even when committed to a private repository, is not ideal. Instead, use Pulumi's built-in secret management (covered in Module 4) or integrate with Azure Key Vault to store and retrieve these secrets securely.
- **Network Security**: Always configure network access restrictions. For Azure SQL Database, use firewall rules. For more advanced scenarios like App Services accessing SQL or Redis, integrate with Virtual Networks and Private Endpoints (covered in Module 3) to ensure traffic stays within your private network.
- **Environment Separation**: Use Pulumi stacks to manage different environments (development, staging, production). Each stack can have different configurations for database tiers, sizes, and connection strings, preventing accidental changes to production resources from a development deployment.
- **Tagging**: Apply consistent tags to all your data resources. Tags are key-value pairs that help with cost management, resource organization, and policy enforcement.
- **Monitoring and Alerting**: While the deployment of monitoring solutions themselves is covered in Module 7, anticipate the need for monitoring and alerting for your databases (e.g., CPU utilization, storage consumption, connection errors) from the start.

## Practical Examples and Demonstrations

Let's combine some of these data services into a single Pulumi program, simulating a simple web application's data tier.

Imagine an e-commerce application needing a relational database for product details and user accounts, a NoSQL database for flexible product cataloging and recommendations, and a cache for popular items.

``` typescript
import * as azure from "@pulumi/azure-native";
import * as pulumi from "@pulumi/pulumi";

// 1. Create a Resource Group for all data services
const dataResourceGroup = new azure.resources.ResourceGroup("ecommerce-data-rg", {
    resourceGroupName: "ecommerce-data-rg-pulumi",
    location: "West US 2",
    tags: {
        project: "ecommerce-app",
        environment: "dev",
    },
});

// 2. Deploy Azure SQL Database for transactional data (e.g., orders, user profiles)
const sqlServer = new azure.sql.Server("ecommerce-sql-server", {
    resourceGroupName: dataResourceGroup.name,
    serverName: "ecom-pul-sql-server-123", // Globally unique
    location: dataResourceGroup.location,
    version: "12.0",
    administratorLogin: "ecomadmin",
    administratorLoginPassword: new pulumi.Config().requireSecret("sqlAdminPassword"), // Get password from Pulumi config secrets
});

const sqlDatabase = new azure.sql.Database("ecommerce-main-db", {
    resourceGroupName: dataResourceGroup.name,
    serverName: sqlServer.name,
    databaseName: "ECommerceDB",
    location: dataResourceGroup.location,
    sku: {
        name: "S0",
        tier: "Standard",
        capacity: 10,
    },
});

// Allow Azure services to connect to SQL Server (e.g., for App Service)
const sqlServerFirewallRule = new azure.sql.FirewallRule("sql-allow-azure-services", {
    resourceGroupName: dataResourceGroup.name,
    serverName: sqlServer.name,
    firewallRuleName: "AllowAzureServices",
    startIpAddress: "0.0.0.0",
    endIpAddress: "0.0.0.0",
});

// 3. Deploy Azure Cosmos DB (SQL API) for product catalog and recommendations
const cosmosdbAccount = new azure.documentdb.DatabaseAccount("ecommerce-cosmosdb", {
    resourceGroupName: dataResourceGroup.name,
    accountName: "ecom-pul-cosmosdb-acc-456", // Globally unique
    location: dataResourceGroup.location,
    databaseAccountOfferType: "Standard",
    capabilities: [{ name: "EnableTable" }], // Example: Enable Table API
    consistencyPolicy: {
        defaultConsistencyLevel: "Session",
    },
    locations: [{ locationName: dataResourceGroup.location, failoverPriority: 0 }],
});

const cosmosdbTable = new azure.documentdb.TableResourceTable("ecommerce-product-table", {
    resourceGroupName: dataResourceGroup.name,
    accountName: cosmosdbAccount.name,
    tableName: "Products",
    resource: { id: "Products" },
    options: { throughput: 400 },
});

// 4. Deploy Azure Cache for Redis for session management and product caching
const redisCache = new azure.cache.Redis("ecommerce-redis-cache", {
    resourceGroupName: dataResourceGroup.name,
    name: "ecom-pul-redis-cache-789", // Globally unique
    location: dataResourceGroup.location,
    sku: {
        name: "Standard",
        family: "C",
        capacity: 1,
    },
    minimumTlsVersion: "1.2",
    enableNonSslPort: false,
});

// Export relevant endpoints and connection details
export const sqlServerFullyQualifiedDomainName = sqlServer.fullyQualifiedDomainName;
export const sqlDatabaseConnectionString = pulumi.all([sqlServer.fullyQualifiedDomainName, sqlDatabase.name]).apply(([server, db]) =>
    `Server=tcp:${server},1433;Initial Catalog=${db};User ID=${sqlServer.administratorLogin};Password=${new pulumi.Config().requireSecret("sqlAdminPassword")};Encrypt=True;Connection Timeout=30;`
);
export const cosmosdbEndpoint = cosmosdbAccount.documentEndpoint;
export const cosmosdbPrimaryKey = cosmosdbAccount.primaryMasterKey; // Use primaryMasterKey for programmatic access
export const redisCacheHostname = redisCache.hostname;
export const redisCachePrimaryKey = redisCache.primaryKey;
```