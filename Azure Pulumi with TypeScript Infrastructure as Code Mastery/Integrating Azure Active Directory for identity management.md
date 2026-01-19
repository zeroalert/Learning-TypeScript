Azure Active Directory (Azure AD), now known as Microsoft Entra ID, is a cloud-based identity and access management service that helps employees sign in and access resources. Integrating Pulumi with Azure AD allows for programmatic management of identity resources, enabling Infrastructure as Code for users, groups, service principals, and application registrations. This capability extends the declarative infrastructure approach to the identity plane, ensuring consistent and auditable configurations for access control.

## Understanding Identity Management with Azure Active Directory

Azure AD is a comprehensive identity solution that provides single sign-on (SSO), multi-factor authentication, and conditional access to protect users from cybersecurity attacks. It manages identities for cloud resources, such as Azure, Microsoft 365, and various SaaS applications, as well as on-premises applications. For infrastructure as code, managing these identities programmatically ensures that access policies and user configurations are consistently applied across environments, reducing manual errors and improving security posture.

A core concept in Azure AD is the _tenant_, which represents an organization and serves as a dedicated instance of Azure AD. Within a tenant, you manage _users_ (human identities), _groups_ (collections of users or other groups for easier permission management), _applications_ (representing software that needs to interact with Azure AD), and _service principals_ (instances of applications within a specific tenant, used for non-human identities like CI/CD pipelines or other automated services).

### Users and Groups

Users are the fundamental building blocks of identity. In an enterprise setting, users can be internal employees, external partners, or even machine accounts. Grouping users simplifies access management, as permissions can be assigned to a group once, and all members inherit those permissions. This adheres to the principle of least privilege and role-based access control (RBAC).

**Example 1: Creating an Azure AD User and Group**

A common scenario involves creating a user account for a new employee and adding them to a specific department group. With Pulumi, this process can be automated.

``` typescript
import * as azuread from "@pulumi/azuread";
import * as pulumi from "@pulumi/pulumi";

// Create an Azure AD user
const newEmployeeUser = new azuread.User("newEmployeeUser", {
    displayName: "Jane Doe",
    userPrincipalName: "jane.doe@yourdomain.onmicrosoft.com", // Must be a valid UPN within your tenant
    password: "ComplexPassword123!", // In a real scenario, use Pulumi secrets for passwords
    // forcePasswordChange: true, // Optional: Force user to change password on first login
    accountEnabled: true,
});

// Create an Azure AD group for the "Developers" department
const developersGroup = new azuread.Group("developersGroup", {
    displayName: "Developers",
    securityEnabled: true, // Enables the group for security purposes
});

// Add the new employee to the Developers group
const groupMembership = new azuread.GroupMember("janeDoeDevelopersMembership", {
    groupObjectId: developersGroup.objectId,
    memberObjectId: newEmployeeUser.objectId,
});

// Export the object IDs for reference
export const newEmployeeUserId = newEmployeeUser.objectId;
export const developersGroupId = developersGroup.objectId;
```

This code snippet defines a new user with a specified UPN and displays name. It also creates a security-enabled group named "Developers" and then adds the newly created user to this group. The `userPrincipalName` is critical as it serves as the user's login identifier. Using Pulumi for this ensures that user provisioning is consistent and auditable, especially when onboarding many new employees or managing departmental structures.

**Example 2: Managing External Users (Guest Accounts)**

Organizations often collaborate with external vendors or partners. Azure AD supports guest accounts for this purpose.

``` typescript
import * as azuread from "@pulumi/azuread";
import * as pulumi from "@pulumi/pulumi";

// Create an Azure AD Guest User for a consultant
const consultantUser = new azuread.User("consultantUser", {
    displayName: "Consultant Bob",
    userPrincipalName: "bob.consultant_external-domain.com#EXT#@yourdomain.onmicrosoft.com", // Special UPN format for guest users
    mailNickname: "bob_consultant_external",
    usageLocation: "US", // Required for guest users
    // accountEnabled: true, // Guest users are typically enabled by default upon invitation acceptance
    externalUserState: "Accepted", // Represents the state of the invitation
    // In a real-world scenario, you would typically invite them, which sends an email
    // For direct creation in Pulumi, the UPN format is specific, and the user might still need to accept an invitation process flow
});

// Create a group for "External Collaborators"
const externalCollaboratorsGroup = new azuread.Group("externalCollaboratorsGroup", {
    displayName: "External Collaborators",
    securityEnabled: true,
});

// Add the consultant to the External Collaborators group
const guestGroupMembership = new azuread.GroupMember("bobConsultantExternalMembership", {
    groupObjectId: externalCollaboratorsGroup.objectId,
    memberObjectId: consultantUser.objectId,
});

export const consultantUserId = consultantUser.objectId;
export const externalCollaboratorsGroupId = externalCollaboratorsGroup.objectId;
```

Managing guest users requires adherence to a specific UPN format (`user_external-domain.com#EXT#@yourdomain.onmicrosoft.com`) and often involves the `usageLocation` property. While direct creation is possible, the typical flow for guest users involves an invitation process where the guest accepts access to the tenant. Pulumi can manage the _state_ of the guest user and their group memberships once they exist or are created directly in this manner.

### Applications and Service Principals
Applications in Azure AD represent software entities that need access to protected resources or expose APIs. A _service principal_ is an instance of an application in a specific Azure AD tenant. It defines what the application can actually do in that tenant, including which resources it can access and what permissions it has. Think of an application as a global template, and a service principal as a concrete instantiation of that template in your tenant. Service principals are crucial for securing automated processes, such as CI/CD pipelines, background services, or other Pulumi deployments themselves, which need to authenticate against Azure.

**Example 1: Registering an Application and Creating a Service Principal**

Let's say you have a web application that needs to authenticate users via Azure AD and perhaps read some user profiles.

``` typescript
import * as azuread from "@pulumi/azuread";
import * as pulumi from "@pulumi/pulumi";

// Register an Azure AD Application
const myWebApp = new azuread.Application("myWebApp", {
    displayName: "MyWebApp",
    signInAudience: "AzureADMyOrg", // Specifies who can sign in to the application. AzureADMyOrg for single tenant.
    // replyUrls: ["https://myapp.com/signin-oidc"], // Redirect URIs for authentication flows
    // optionalClaims: [{
    //     accessToken: [
    //         { name: "upn", source: "user", essential: false },
    //     ],
    // }],
});

// Create a Service Principal for the application
const myWebAppSp = new azuread.ServicePrincipal("myWebAppSp", {
    applicationId: myWebApp.applicationId, // Links the Service Principal to the Application
    appRoleAssignmentRequired: false, // Set to true if users must be assigned to the app roles
});

// Create a Service Principal Password (Client Secret) for the application to authenticate
const myWebAppSpPassword = new azuread.ServicePrincipalPassword("myWebAppSpPassword", {
    servicePrincipalId: myWebAppSp.objectId,
    endDate: "2025-01-01T00:00:00Z", // Set an expiration date for the secret
    value: new pulumi.RandomPassword("myWebAppSecretValue", {
        length: 32,
        special: true,
    }).result, // Use Pulumi's random password generator for secure secrets
});

export const webAppApplicationId = myWebApp.applicationId;
export const webAppServicePrincipalId = myWebAppSp.objectId;
export const webAppClientSecret = myWebAppSpPassword.value; // DO NOT export in production! Store securely.
```

This code first defines an `Application` registration, which is a global object in Azure AD. Then, it creates a `ServicePrincipal` resource linked to that application, making it tangible within your tenant. Finally, a `ServicePrincipalPassword` (client secret) is generated, which the web application will use to authenticate itself to Azure AD. The secret's value should be treated as sensitive data and managed using Pulumi's secrets management, as discussed in Module 4.

**Example 2: Granting Permissions to a Service Principal (e.g., for a CI/CD pipeline)**

A common use case for service principals is to provide a CI/CD pipeline (e.g., GitHub Actions or Azure DevOps) with the necessary permissions to deploy resources to Azure. This involves granting the service principal a specific RBAC role on a resource group or subscription.

``` typescript
import * as azuread from "@pulumi/azuread";
import * as azure from "@pulumi/azure-native";
import * as pulumi from "@pulumi/pulumi";

// Assume a resource group already exists or is created here
const resourceGroup = new azure.resources.ResourceGroup("devResourceGroup", {
    resourceGroupName: "dev-pulumi-rg",
    location: "East US",
});

// Create a Service Principal for a CI/CD pipeline
const cicdSp = new azuread.ServicePrincipal("cicdSp", {
    applicationId: new azuread.Application("cicdApp", {
        displayName: "CI-CD-Pipeline-App",
        signInAudience: "AzureADMyOrg",
    }).applicationId,
    appRoleAssignmentRequired: false,
});

// Assign the "Contributor" role to the CI/CD Service Principal on the resource group
const contributorRoleAssignment = new azure.authorization.RoleAssignment("cicdContributorRole", {
    scope: resourceGroup.id, // Assign role to the specific resource group
    roleDefinitionName: "Contributor", // Built-in Azure role
    principalId: cicdSp.objectId,
    principalType: "ServicePrincipal",
});

export const cicdServicePrincipalId = cicdSp.objectId;
export const resourceGroupId = resourceGroup.name;
```

This snippet demonstrates creating a service principal specifically for a CI/CD pipeline and then assigning it the built-in "Contributor" role to a newly created resource group. The `scope` parameter in `azure.authorization.RoleAssignment` is crucial as it defines _where_ the service principal has access. This method ensures that your automation has only the necessary permissions, following the principle of least privilege. In Module 4, we will delve deeper into managing secrets like client passwords for these service principals securely.

## Best Practices for Azure AD and Pulumi

When managing Azure AD resources with Pulumi, adhering to best practices is crucial for security, maintainability, and operational efficiency.

- **Principle of Least Privilege:** Always grant only the minimum necessary permissions to users, groups, and especially service principals. Avoid assigning overly broad roles like "Owner" unless absolutely essential.
- **Automate Secret Rotation:** Client secrets for service principals have expiration dates. Automate their rotation using Pulumi's capabilities for secret management and potentially integrate with Azure Key Vault for storing these secrets, which is covered in a previous lesson (Module 3, Lesson 2: Managing Azure Key Vault).
- **Group-Based Access Control:** Whenever possible, assign permissions to groups rather than individual users. This simplifies management; adding or removing a user from a group automatically updates their access rights.
- **Separate Concerns:** Design your Pulumi projects to separate Azure AD identity management from other infrastructure deployments. This can mean having a dedicated Pulumi stack or project for identity resources.
- **Use Pulumi Secrets:** Never hardcode passwords or client secrets directly in your Pulumi code. Utilize `pulumi.Config.requireSecret()` or `pulumi.Config.getSecret()` to manage sensitive values securely. This will be covered extensively in Module 4.
- **Review and Audit:** Regularly review your Azure AD configurations managed by Pulumi. This ensures that old accounts are deprovisioned and permissions remain appropriate. The declarative nature of Pulumi makes auditing easier.
- **Idempotency:** Pulumi automatically handles the idempotent nature of resource deployment. Running the same Pulumi program multiple times will result in the same desired state without re-creating resources unnecessarily, which is a key benefit for identity management.

## Practical Examples and Demonstrations

Let's combine some concepts to illustrate a more comprehensive scenario: onboarding a new team for a specific project. This involves creating a dedicated group, adding team members, creating an application and service principal for their project's backend, and assigning necessary permissions.

### Scenario: Onboarding the "Project Alpha" Team

The "Project Alpha" team needs:

1. A security group to manage team members.
2. Individual user accounts for two new team members.
3. An Azure AD application registration for their backend API.
4. A service principal for this application to authenticate to Azure resources.
5. Permissions for the application to access a specific resource group.

``` typescript
import * as azuread from "@pulumi/azuread";
import * as azure from "@pulumi/azure-native";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";

// 1. Create a security group for "Project Alpha Team"
const projectAlphaGroup = new azuread.Group("projectAlphaTeamGroup", {
    displayName: "Project Alpha Team",
    securityEnabled: true,
    mailEnabled: false, // This is a security group, not a mail-enabled group
});

// 2. Create individual user accounts for new team members
// Using a random password generator for demonstration; in production, use Pulumi secrets or other secure methods.
const janeDoePassword = new random.RandomPassword("janeDoePassword", {
    length: 16,
    special: true,
}).result;

const janeDoe = new azuread.User("janeDoe", {
    displayName: "Jane Doe (Alpha Team)",
    userPrincipalName: "jane.doe.alpha@yourdomain.onmicrosoft.com",
    password: janeDoePassword,
    accountEnabled: true,
    forcePasswordChange: true, // Force password change on first login for security
});

const johnSmithPassword = new random.RandomPassword("johnSmithPassword", {
    length: 16,
    special: true,
}).result;

const johnSmith = new azuread.User("johnSmith", {
    displayName: "John Smith (Alpha Team)",
    userPrincipalName: "john.smith.alpha@yourdomain.onmicrosoft.com",
    password: johnSmithPassword,
    accountEnabled: true,
    forcePasswordChange: true,
});

// Add new team members to the Project Alpha Group
const janeDoeMembership = new azuread.GroupMember("janeDoeAlphaMembership", {
    groupObjectId: projectAlphaGroup.objectId,
    memberObjectId: janeDoe.objectId,
});

const johnSmithMembership = new azuread.GroupMember("johnSmithAlphaMembership", {
    groupObjectId: projectAlphaGroup.objectId,
    memberObjectId: johnSmith.objectId,
});

// 3. Create an Azure AD Application Registration for the Project Alpha Backend API
const projectAlphaBackendApp = new azuread.Application("projectAlphaBackendApp", {
    displayName: "ProjectAlphaBackendAPI",
    signInAudience: "AzureADMyOrg",
    // Example for exposing an API scope (optional)
    api: {
        oauth2Permissions: [{
            adminConsentDescription: "Allows the application to access ProjectAlphaBackendAPI on behalf of the signed-in user.",
            adminConsentDisplayName: "Access ProjectAlphaBackendAPI",
            id: "2d5e5330-80a6-43f1-b4f0-b6f1a8e1e1e1", // Unique GUID
            isEnabled: true,
            type: "User",
            userConsentDescription: "Allows the application to access ProjectAlphaBackendAPI on your behalf.",
            userConsentDisplayName: "Access ProjectAlphaBackendAPI",
            value: "user_impersonation",
        }],
    },
});

// 4. Create a Service Principal for the Project Alpha Backend Application
const projectAlphaBackendSp = new azuread.ServicePrincipal("projectAlphaBackendSp", {
    applicationId: projectAlphaBackendApp.applicationId,
    appRoleAssignmentRequired: false,
});

// Generate a client secret for the service principal
const projectAlphaBackendSpPassword = new azuread.ServicePrincipalPassword("projectAlphaBackendSpPassword", {
    servicePrincipalId: projectAlphaBackendSp.objectId,
    endDate: "2026-01-01T00:00:00Z", // Secret validity for 2 years
    value: new random.RandomPassword("projectAlphaBackendSecretValue", {
        length: 48,
        special: true,
        overrideSpecial: "!@#$%^&*", // Specific characters for stronger secrets
    }).result,
});

// 5. Create a dedicated resource group for Project Alpha resources
const projectAlphaResourceGroup = new azure.resources.ResourceGroup("projectAlphaResourceGroup", {
    resourceGroupName: "rg-projectalpha-dev",
    location: "West US 2",
});

// Assign the "Contributor" role to the Project Alpha Backend Service Principal on its resource group
const backendSpContributorRole = new azure.authorization.RoleAssignment("projectAlphaBackendSpContributor", {
    scope: projectAlphaResourceGroup.id,
    roleDefinitionName: "Contributor",
    principalId: projectAlphaBackendSp.objectId,
    principalType: "ServicePrincipal",
});

// Export relevant IDs for reference
export const projectAlphaGroupId = projectAlphaGroup.objectId;
export const janeDoeUserId = janeDoe.objectId;
export const johnSmithUserId = johnSmith.objectId;
export const projectAlphaBackendApplicationId = projectAlphaBackendApp.applicationId;
export const projectAlphaBackendServicePrincipalId = projectAlphaBackendSp.objectId;
export const projectAlphaBackendClientSecret = pulumi.secret(projectAlphaBackendSpPassword.value); // Mark as secret!
export const projectAlphaResourceGroupId = projectAlphaResourceGroup.name;
```

This comprehensive example demonstrates how Pulumi can manage a full identity lifecycle for a new project team within Azure AD. It shows creating users, assigning them to a group, registering an application, creating its service principal, generating a client secret, and finally assigning permissions to that service principal on an Azure resource group. Notice the use of `pulumi.secret()` for the client secret export, which is crucial for preventing sensitive data from being stored in plain text in the Pulumi state file. This directly sets the stage for Module 4, which focuses on state management and secrets.