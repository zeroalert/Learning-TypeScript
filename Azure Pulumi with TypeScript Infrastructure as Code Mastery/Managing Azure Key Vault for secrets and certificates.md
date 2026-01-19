Azure Key Vault provides a secure, centralized store for secrets, cryptographic keys, and SSL/TLS certificates. It addresses the challenge of securely managing sensitive information in cloud applications by offering hardware security module (HSM)-backed storage, strict access control, and auditing capabilities. Integrating Key Vault into your Pulumi infrastructure deployments allows you to provision, configure, and manage these security assets as code, ensuring consistency, traceability, and adherence to security best practices.

## Understanding Azure Key Vault Fundamentals

Azure Key Vault is a cloud service that safeguards encryption keys, certificates, and secrets like API keys and database connection strings. By using Key Vault, you can prevent the accidental exposure of sensitive information in your code, version control, or configuration files. Pulumi enables the declarative definition and management of Key Vaults and their contained objects, integrating security directly into your IaC workflows.

### Key Vault Object Types

Key Vault supports three main types of objects:

- **Secrets:** These are small data blobs, such as passwords, connection strings, or any other sensitive text-based information. Key Vault ensures secrets are stored encrypted at rest and in transit.
    
    - **Example:** A database connection string containing a username and password. Instead of hardcoding this string in an application's configuration, it's stored as a secret in Key Vault. When the application needs to connect, it retrieves the secret from Key Vault using its Managed Identity, never directly exposing the sensitive data.
    - **Hypothetical Scenario:** A microservice architecture where each service requires credentials to communicate with a central message broker. Each service could retrieve its specific broker credentials as a secret from Key Vault, isolating credentials and preventing any single service from having access to all other service credentials.
- **Keys:** These are cryptographic keys that can be used for encryption, decryption, signing, and verification. Keys can be software-protected or, for enhanced security, HSM-protected.
    
    - **Example:** An application needs to encrypt customer data before storing it in a database. It can use a Key Vault key to perform the encryption operation without the application itself ever handling the raw encryption key material. Key Vault handles the cryptographic operations securely.
    - **Advanced Example:** Generating a key for Azure Storage Account encryption. Instead of using Microsoft-managed keys, you can bring your own key (CMK) stored in Key Vault. Pulumi can provision the Key Vault, generate the key, and then configure the Storage Account to use this key for encryption.
- **Certificates:** These are X.509 certificates that can be used for SSL/TLS, code signing, or other cryptographic purposes. Key Vault can manage the entire lifecycle of certificates, including renewal.
    
    - **Example:** An Azure App Service hosting a web application requires an SSL/TLS certificate for secure communication. You can store the certificate (including its private key) in Key Vault and then configure the App Service to use this certificate directly from Key Vault, eliminating the need to manually upload and manage certificates on the application platform.
    - **Real-World Example:** An enterprise needs to deploy hundreds of microservices, each requiring an SSL certificate for its API gateway. Manually creating and renewing these certificates is a monumental task. By using Key Vault, they can automate certificate issuance and renewal, linking them to their DNS provider and ensuring all services have valid, up-to-date certificates without human intervention.

## Provisioning Azure Key Vault with Pulumi

To manage secrets, keys, and certificates, you first need to deploy an Azure Key Vault instance. This involves defining the Key Vault itself, its SKU (pricing tier), and initial access policies.

``` typescript
import * as azure from "@pulumi/azure";
import * as azure_native from "@pulumi/azure-native";
import * as pulumi from "@pulumi/pulumi";

// Assume a resource group is already created as in previous lessons.
// For example, if we use the 'networking-rg' from the Virtual Networks lesson.
const resourceGroupName = "networking-rg"; 

// Create an Azure Key Vault
const keyVault = new azure_native.keyvault.Vault("myKeyVault", {
    resourceGroupName: resourceGroupName,
    location: "East US", // Choose an appropriate Azure region
    vaultName: "mysecureappkeyvault12345", // Must be globally unique
    properties: {
        sku: {
            family: "A",
            name: "standard", // Use 'standard' for basic functionality, 'premium' for HSM-backed keys
        },
        tenantId: "YOUR_AZURE_TENANT_ID", // Replace with your Azure Tenant ID
        enabledForDeployment: true, // Allows Azure Resource Manager to retrieve certificates stored in Key Vault
        enabledForDiskEncryption: true, // Allows Key Vault to be used for Azure Disk Encryption
        enabledForTemplateDeployment: true, // Allows Resource Manager to access secrets and certificates for template deployments
        // Initial access policies. We will manage these more granularly below.
        // For simplicity, we are granting the current user (Pulumi deployer) all permissions initially.
        // In a real-world scenario, you would grant specific permissions to specific identities (e.g., Managed Identities).
        accessPolicies: [{
            tenantId: "YOUR_AZURE_TENANT_ID", // Replace with your Azure Tenant ID
            objectId: "YOUR_USER_OBJECT_ID", // Replace with your Azure User's Object ID or Service Principal ID
            permissions: {
                keys: ["get", "list", "create", "delete", "recover", "backup", "restore", "import", "update", "sign", "verify", "encrypt", "decrypt", "wrapKey", "unwrapKey"],
                secrets: ["get", "list", "set", "delete", "recover", "backup", "restore"],
                certificates: ["get", "list", "delete", "create", "import", "update", "managecontacts", "manageissuers", "getissuers", "listissuers", "recover", "backup", "restore"],
            },
        }],
    },
});

// Output the Key Vault URI for reference
export const keyVaultUri = keyVault.properties.vaultUri;
```

- `vaultName`: Must be globally unique. A common pattern is to combine application name, environment, and a random string.
- `sku`: Determines the performance and features. `standard` is suitable for most use cases. `premium` offers hardware security module (HSM) backed keys for FIPS 140-2 Level 2 validated security.
- `tenantId`: Your Azure Active Directory tenant ID.
- `accessPolicies`: Crucial for controlling who or what can access the Key Vault and its contents. We'll delve deeper into this.
## Managing Key Vault Access Policies

Access policies define which users, groups, or applications (Service Principals/Managed Identities) can perform specific operations on keys, secrets, and certificates within the Key Vault. It's critical to follow the principle of least privilege, granting only the necessary permissions.

### Granting Access to a Managed Identity

In a production environment, applications should use Managed Identities to access Key Vault. This eliminates the need to manage credentials for your applications.

``` typescript
import * as azure_native from "@pulumi/azure-native";
import * as pulumi from "@pulumi/pulumi";

// Assume keyVault is already defined as above
// Assume an Azure App Service with a Managed Identity exists
// For demonstration, let's create a dummy App Service with System-Assigned Managed Identity
const appServicePlan = new azure_native.web.AppServicePlan("appServicePlan", {
    resourceGroupName: "networking-rg",
    location: "East US",
    sku: {
        name: "B1",
        tier: "Basic",
    },
});

const appService = new azure_native.web.WebApp("myAppService", {
    resourceGroupName: "networking-rg",
    location: "East US",
    serverFarmId: appServicePlan.id,
    identity: {
        type: "SystemAssigned", // Enable System-Assigned Managed Identity
    },
    // Other App Service properties...
});

// Once the App Service is deployed, its Managed Identity Principal ID becomes available
const appServicePrincipalId = appService.identity.apply(identity => identity?.principalId);

// Add an access policy to the Key Vault for the App Service's Managed Identity
const keyVaultAccessPolicy = new azure_native.keyvault.VaultAccessPolicy("appServiceAccessPolicy", {
    vaultName: keyVault.name, // Reference the previously created Key Vault
    resourceGroupName: "networking-rg",
    tenantId: "YOUR_AZURE_TENANT_ID", // Your Azure Tenant ID
    objectId: appServicePrincipalId, // The Principal ID of the App Service's Managed Identity
    permissions: {
        secrets: ["get"], // Grant only 'get' permission for secrets
    },
    // Make sure to also manage the existing policies
    // This is a simplified approach, in a real scenario you might append to existing policies
    // or use a different resource if you need to manage multiple policies declaratively.
    // For direct `VaultAccessPolicy` resource, you define *all* policies for a given objectId.
    // If you need to add to existing policies of the vault, you might need to read the current policies
    // and then update the `keyVault` resource's `properties.accessPolicies` directly.
    // However, for this example, we assume we are setting it up for the first time for this ID.
});

// A more robust way to manage multiple access policies on a single vault
// is to update the keyVault resource directly, ensuring all policies are defined together.
// This is an illustrative example of *how* to set up policy for a managed identity.
// For a full production scenario, you would usually define all access policies within the main Key Vault definition.
// For instance, if you had multiple identities needing access:
/*
const combinedAccessPolicies = pulumi.all([
    pulumi.output({ // Current user policy
        tenantId: "YOUR_AZURE_TENANT_ID",
        objectId: "YOUR_USER_OBJECT_ID",
        permissions: {
            keys: ["get", "list", "create", "delete", "recover", "backup", "restore", "import", "update", "sign", "verify", "encrypt", "decrypt", "wrapKey", "unwrapKey"],
            secrets: ["get", "list", "set", "delete", "recover", "backup", "restore"],
            certificates: ["get", "list", "delete", "create", "import", "update", "managecontacts", "manageissuers", "getissuers", "listissuers", "recover", "backup", "restore"],
        },
    }),
    appServicePrincipalId.apply(id => id ? { // App Service Managed Identity policy
        tenantId: "YOUR_AZURE_TENANT_ID",
        objectId: id,
        permissions: {
            secrets: ["get"],
        },
    } : undefined),
]).apply(policies => policies.filter(p => p !== undefined) as azure_native.keyvault.inputs.VaultAccessPolicyArgs[]);

const updatedKeyVault = new azure_native.keyvault.Vault("myKeyVaultUpdated", {
    resourceGroupName: resourceGroupName,
    location: "East US",
    vaultName: "mysecureappkeyvault12345", // Must match the original name for update
    properties: {
        sku: { family: "A", name: "standard" },
        tenantId: "YOUR_AZURE_TENANT_ID",
        enabledForDeployment: true,
        enabledForDiskEncryption: true,
        enabledForTemplateDeployment: true,
        accessPolicies: combinedAccessPolicies, // All policies defined here
    },
}, { dependsOn: [appService, keyVault] }); // Ensure App Service and initial Key Vault are ready
*/
```

- **Principal ID**: The object ID of the Managed Identity (or user/group/Service Principal) that needs access.
- **Permissions**: A list of specific actions allowed on keys, secrets, or certificates. For an application retrieving a secret, `secrets: ["get"]` is usually sufficient.

## Managing Secrets in Key Vault with Pulumi

Once the Key Vault is provisioned and access policies are set, you can add secrets. Pulumi allows you to define these secrets directly in your code.

``` typescript
import * as azure_native from "@pulumi/azure-native";
import * as pulumi from "@pulumi/pulumi";

// Assume keyVault and its URI are available from previous steps
// const keyVaultUri = keyVault.properties.vaultUri; 

// Create a secret in the Key Vault
const dbConnectionString = new azure_native.keyvault.Secret("dbConnectionString", {
    resourceGroupName: "networking-rg",
    vaultName: "mysecureappkeyvault12345", // Reference the created Key Vault's name
    secretName: "MySqlDbConnection",
    properties: {
        value: "Server=myserver.mysql.database.azure.com;Database=mydb;Uid=myuser;Pwd=mySecurePassword123!",
        // Optional: add content type, expiration, activation date, tags
        contentType: "text/plain",
    },
});

// Output the secret ID (not the value itself) for reference
export const dbSecretId = dbConnectionString.id;

// Example of how an application would reference this in its configuration
// (Not part of Pulumi deployment, but for conceptual understanding)
// Connection strings for applications often refer to the Key Vault secret URI:
// @Microsoft.KeyVault(SecretUri=https://mysecureappkeyvault12345.vault.azure.net/secrets/MySqlDbConnection/latest)
```

- `secretName`: A unique name for your secret within the Key Vault.
- `value`: The actual secret string. While Pulumi manages this value, it's best practice to retrieve this from a secure source during deployment (e.g., Pulumi config secrets, environment variables, or another secret store) rather than hardcoding it directly in your TypeScript file.
    - **Security Note:** If you place raw secrets in your Pulumi code, they _will_ be stored in plain text in your Pulumi state file unless explicitly marked as a Pulumi secret using `new pulumi.Config().requireSecret()`. Always use Pulumi's built-in secret management for sensitive values, as covered in Module 4.
## Managing Certificates in Key Vault with Pulumi

Managing SSL/TLS certificates involves storing them securely, often handling their renewal. Key Vault simplifies this.

``` typescript
import * as azure_native from "@pulumi/azure-native";
import * as pulumi from "@pulumi/pulumi";

// Assume keyVault is already defined
// const keyVaultUri = keyVault.properties.vaultUri;

// Create a self-signed certificate in Key Vault for demonstration purposes
const selfSignedCert = new azure_native.keyvault.Certificate("mySelfSignedCert", {
    resourceGroupName: "networking-rg",
    vaultName: "mysecureappkeyvault12345",
    certificateName: "WebAppCert",
    properties: {
        policy: {
            keyProperties: {
                exportable: true, // Set to true if you need to export the private key for use elsewhere
                keySize: 2048,
                keyType: "RSA",
                reuseKey: false,
            },
            secretProperties: {
                contentType: "application/x-pkcs12", // PFX format
            },
            x509CertificateProperties: {
                subject: "CN=www.mywebapp.com", // Common Name for the certificate
                ekus: ["1.3.6.1.5.5.7.3.1", "1.3.6.1.5.5.7.3.2"], // Server Auth, Client Auth
                validityInMonths: 12,
            },
            issuerParameters: {
                name: "Self", // Use "Self" for self-signed, or reference a certificate authority
            },
        },
    },
});

// Output the certificate ID
export const webAppCertId = selfSignedCert.id;

// To import an existing certificate (PFX file)
/*
const existingCert = new azure_native.keyvault.Certificate("existingWebAppCert", {
    resourceGroupName: "networking-rg",
    vaultName: "mysecureappkeyvault12345",
    certificateName: "ExistingWebAppCert",
    properties: {
        // base64-encoded PFX content
        // You would typically load this securely, e.g., from Pulumi config secrets
        value: pulumi.secret("YOUR_BASE64_ENCODED_PFX_CONTENT_HERE"), 
        policy: {
            keyProperties: { exportable: true, keySize: 2048, keyType: "RSA", reuseKey: false },
            secretProperties: { contentType: "application/x-pkcs12" },
            x509CertificateProperties: {
                subject: "CN=www.existingwebapp.com",
                ekus: ["1.3.6.1.5.5.7.3.1", "1.3.6.1.5.5.7.3.2"],
                validityInMonths: 12,
            },
            issuerParameters: { name: "Unknown" }, // Or the actual issuer name if known
        },
    },
});
*/
```

- `policy`: Defines the properties of the certificate, including key type, size, subject, and issuer.
- `exportable`: Set to `true` if the private key needs to be extracted from Key Vault (e.g., for App Service integration). Be cautious with this setting.
- `issuerParameters`: For self-signed certificates, use `"Self"`. For certificates from a CA, you'd configure an `issuer` in Key Vault and reference it here.

## Practical Examples and Demonstrations

Let's combine these concepts into a more complete scenario: deploying a web application with a Managed Identity that retrieves its database connection string from Key Vault and uses a certificate for SSL/TLS.

```  typescript
 
import * as azure_native from "@pulumi/azure-native";
import * as pulumi from "@pulumi/pulumi";

// 1. Define Resource Group (reusing from Module 2 if applicable)
const resourceGroupName = "pulumi-kv-app-rg";
const resourceGroup = new azure_native.resources.ResourceGroup("appResourceGroup", {
    resourceGroupName: resourceGroupName,
    location: "East US",
});

// 2. Create Key Vault
const tenantId = "YOUR_AZURE_TENANT_ID"; // Replace with your Tenant ID
const userId = "YOUR_USER_OBJECT_ID";   // Replace with your User Object ID for initial access

const appKeyVault = new azure_native.keyvault.Vault("appKeyVault", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    vaultName: pulumi.interpolate`app${pulumi.getStack()}keyvault${resourceGroup.name.apply(n => n.slice(-4)).toLowerCase()}`, // Unique name
    properties: {
        sku: { family: "A", name: "standard" },
        tenantId: tenantId,
        enabledForDeployment: true,
        enabledForTemplateDeployment: true,
        accessPolicies: [{ // Grant initial access to the deployer
            tenantId: tenantId,
            objectId: userId,
            permissions: {
                keys: ["get", "list", "create", "delete"],
                secrets: ["get", "list", "set", "delete"],
                certificates: ["get", "list", "create", "delete", "import", "update"],
            },
        }],
    },
});

// 3. Create App Service Plan and App Service with System-Assigned Managed Identity
const appServicePlan = new azure_native.web.AppServicePlan("appServicePlan", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    sku: { name: "B1", tier: "Basic" },
});

const webApp = new azure_native.web.WebApp("myWebApp", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    serverFarmId: appServicePlan.id,
    identity: { type: "SystemAssigned" }, // Enable Managed Identity
    siteConfig: {
        alwaysOn: true,
        // Example of an app setting that references a Key Vault secret
        appSettings: [
            {
                name: "DatabaseConnectionString",
                value: pulumi.interpolate`@Microsoft.KeyVault(SecretUri=${appKeyVault.properties.vaultUri}secrets/MyDbSecret/latest)`,
            },
        ],
    },
    httpsOnly: true, // Enforce HTTPS
});

// 4. Grant Managed Identity access to Key Vault secrets
const webAppPrincipalId = webApp.identity.apply(identity => identity?.principalId);

const webAppKeyVaultAccessPolicy = new azure_native.keyvault.VaultAccessPolicy("webAppKvAccessPolicy", {
    vaultName: appKeyVault.name,
    resourceGroupName: resourceGroup.name,
    tenantId: tenantId,
    objectId: webAppPrincipalId, // Grant access to the Web App's Managed Identity
    permissions: {
        secrets: ["get"], // Web App only needs to GET secrets
    },
    // IMPORTANT: When creating VaultAccessPolicy resource, it will *replace* existing access policies for that objectId.
    // If you add multiple, ensure each objectId has its own VaultAccessPolicy resource.
    // A safer way for multiple policies is to define them all within the `appKeyVault` resource directly,
    // as shown in the commented-out section in the "Granting Access to a Managed Identity" section.
}, { dependsOn: [webApp, appKeyVault] }); // Ensure Key Vault and Web App are created before applying policy

// 5. Add a secret to the Key Vault
const dbSecret = new azure_native.keyvault.Secret("myDbSecret", {
    resourceGroupName: resourceGroup.name,
    vaultName: appKeyVault.name,
    secretName: "MyDbSecret",
    // In a real scenario, this value would come from Pulumi config secrets (Module 4) or an environment variable.
    // For this demonstration, we're hardcoding for simplicity.
    properties: {
        value: "Data Source=tcp:mysqldbserver.database.windows.net,1433;Initial Catalog=mydb;User ID=myuser;Password=supersecurepassword!",
        contentType: "text/plain",
    },
});

// 6. Create a self-signed certificate in Key Vault
const webAppCert = new azure_native.keyvault.Certificate("webAppCert", {
    resourceGroupName: resourceGroup.name,
    vaultName: appKeyVault.name,
    certificateName: "WebAppSslCert",
    properties: {
        policy: {
            keyProperties: { exportable: true, keySize: 2048, keyType: "RSA", reuseKey: false },
            secretProperties: { contentType: "application/x-pkcs12" },
            x509CertificateProperties: {
                subject: "CN=www.pulumi-webapp.com", // Replace with your domain if using custom domain
                ekus: ["1.3.6.1.5.5.7.3.1"], // Server Authentication
                validityInMonths: 12,
            },
            issuerParameters: { name: "Self" },
        },
    },
});

// 7. Bind the certificate to the App Service
const certificateBinding = new azure_native.web.WebAppHostNameBinding("appServiceCertBinding", {
    resourceGroupName: resourceGroup.name,
    name: webApp.name,
    hostName: webApp.defaultHostName, // Bind to the default Azure-provided hostname
    sslState: "SniEnabled", // Use SNI SSL
    thumbprint: webAppCert.properties.thumbprint, // Reference the certificate's thumbprint
    // Certificate source indicates it's from Key Vault
    // and certificate ID points to the latest version of the secret backing the certificate
    // App Service reads the certificate from Key Vault as a secret with the appropriate permissions.
    // The certificate import process into App Service happens via the `WebAppHostNameBinding` resource,
    // but the `certificateId` property is what links it to Key Vault.
    certificateId: webAppCert.id.apply(id => {
        // The ID of the certificate in Key Vault is required by App Service when using Key Vault integration.
        // It generally takes the format: /subscriptions/{subId}/resourceGroups/{rgName}/providers/Microsoft.KeyVault/vaults/{vaultName}/certificates/{certName}
        // or for App Service integration specifically, it might need to resolve to the secret ID representing the certificate.
        // For App Service, the Key Vault certificate integration uses the *secret* identifier of the certificate,
        // which represents the actual PFX content in Key Vault's secret store.
        // This is typically the value of `webAppCert.properties.secretId`.
        return webAppCert.properties.secretId;
    }),
}, { dependsOn: [webApp, webAppCert] });

// Outputs
export const appServiceUrl = webApp.defaultHostName.apply(hostName => `https://${hostName}`);
export const keyVaultName = appKeyVault.name;
export const secretName = dbSecret.name;
export const certificateName = webAppCert.name;
```

This comprehensive example demonstrates:

- Creating an Azure Resource Group.
- Provisioning an Azure Key Vault.
- Deploying an Azure App Service with a System-Assigned Managed Identity.
- Granting the App Service's Managed Identity read permissions to secrets in Key Vault.
- Adding a database connection string as a secret to Key Vault.
- Creating a self-signed SSL/TLS certificate in Key Vault.
- Configuring the App Service to use the certificate from Key Vault for HTTPS.
- Setting an application setting that references the Key Vault secret URI, allowing the application to retrieve the secret at runtime using its Managed Identity.

This setup ensures that sensitive data like connection strings and private keys for certificates are never exposed directly in your codebase or configuration files, enhancing security.

Key Vault is a cornerstone for secure cloud deployments. Consider a financial institution building a new online banking platform. This platform will consist of numerous microservices, databases, and APIs.

- **Secrets Management:** Each microservice requires a unique database connection string. Instead of hardcoding these or storing them in environment variables directly on the compute instances, all connection strings, API keys for payment gateways, and third-party integration credentials are stored as secrets in Azure Key Vault. Each microservice uses its own Azure Managed Identity to retrieve only the specific secrets it requires from Key Vault at runtime. This prevents credential sprawl and makes credential rotation simpler.
- **Certificate Management:** The online banking platform needs SSL/TLS certificates for all its public-facing endpoints (web applications, API gateways, load balancers). Key Vault is configured to manage the lifecycle of these certificates, including automated renewal with a trusted Certificate Authority. Pulumi deploys these certificates into Key Vault, and then integrates them with Azure App Services, Application Gateways, and Front Door instances, ensuring consistent, secure communication without manual certificate uploads or monitoring for expiration dates.
- **Key Management:** For sensitive customer data, the institution implements customer-managed encryption keys (CMEK) for Azure SQL Databases and Azure Storage Accounts. The encryption keys are generated and stored as HSM-backed keys in Key Vault. Pulumi provisions these keys and configures the database and storage services to use these keys for encryption at rest, meeting stringent compliance requirements like PCI DSS and HIPAA.

This approach centralizes security asset management, enforces least privilege access, automates lifecycle operations, and provides a clear audit trail of who accessed what and when, significantly reducing the attack surface and simplifying compliance efforts for the financial institution.