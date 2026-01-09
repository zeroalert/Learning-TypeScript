import { Application, ServicePrincipal, ServicePrincipalPassword } from "@pulumi/azuread";
import * as azuread from "@pulumi/azuread";
import { Namespace } from "@pulumi/kubernetes/core/v1/namespace";
import { Secret as K8sSecret } from "@pulumi/kubernetes/core/v1/secret";
import { ConfigFile } from "@pulumi/kubernetes/yaml/v2";
import { AzureBuilder } from "@vizientinc/azure-builder";
import { containerservice } from "@pulumi/azure-native";
import { pulumi } from "@vizientinc/pulumi";
import { Provider as K8sProvider } from "@pulumi/kubernetes/provider";
import { env, config } from "process";
import { Release } from "@pulumi/kubernetes/helm/v3/release";

export function setupCluster(args: {
    azureBuilder: AzureBuilder,
    location: string,
    app: string,
    env: string,
    instance: string,
    resourceGroupId: pulumi.Input<string>,
    aksPrivateDnsZoneId: string,
    clusterName: string,
    availabilityZones: string[],
    clusterConfig: {
        nginxChartVersion: string,
        vnetPrivateLinkSubscriptionIds: string,
        vnetPrivateLinkSubnet: string,
        nodeSubnetAddressPrefix: string,
        systemPoolVmSku: string,
        ingressLoadBalancerIp?: string;
    },
}) {
    const config = new pulumi.Config();
    const aadClientApp = new Application('AdClientApp', {
        displayName: args.clusterName,
        // set to a place holder value within vizient's networks
        publicClient: {
            redirectUris: ["https://vizientinc.com/notused"],
        },
        requiredResourceAccesses: [
            {
                resourceAccesses: [
                    {
                        // user.read
                        id: 'e1fe6dd8-ba31-4d61-89e7-88639da4683d',
                        type: 'Scope',
                    },
                ],
                // graph api
                resourceAppId: '00000003-0000-0000-c000-000000000000'
            }
        ]
    });

    const aadClientSp = new ServicePrincipal('AdClientSp', {
        clientId: aadClientApp.clientId,
    });

    const aadClientSpPassword = new ServicePrincipalPassword('AdClientSpPassword', {
        servicePrincipalId: aadClientSp.id,
        rotateWhenChanged: {
            endDate: '2099-01-01T12:00:00Z'
        }
    });

    const routeTable = args.azureBuilder.Network.Route.BuildOnCorpVnet('atscale-nodes', {
        inspectOutbound: true,
        routeTableName: `atscale-nodes-${args.env}`,
    });

    const nodeSubnet = args.azureBuilder.Network.Subnet.BuildForK8s('atscale-nodes', {
        addressPrefix: args.clusterConfig.nodeSubnetAddressPrefix,
        // Disable Private Link Service network policies on the subnet
        privateLinkServiceNetworkPolicies: 'Disabled',
        routeTable: {
            id: routeTable.id,
        },
    }, aadClientSp);

    const cluster = args.azureBuilder.ContainerService.ManagedCluster.BuildPrivate('cluster', {
        location: args.location,
        resourceName: args.clusterName,
        enableRBAC: true,
        aadProfile: {
            enableAzureRBAC: true,
            managed: true,
            tenantID: args.azureBuilder.tenantId,
        },
        addonProfiles: {
            ...args.azureBuilder.ContainerService.ManagedCluster.AzureKeyvaultSecretsProviderAddon(true),
            ...args.azureBuilder.ContainerService.ManagedCluster.AzurePolicyAddon(true),
            ...args.azureBuilder.ContainerService.ManagedCluster.HttpApplicationRoutingAddon(false),
            ...args.azureBuilder.ContainerService.ManagedCluster.KubeDashboardAddon(false),
        },
        agentPoolProfiles: [
            // System pool - keep existing VM size (cannot change)
            args.azureBuilder.ContainerService.ManagedCluster.PrivateSystemAgentPool({
                vmSize: args.clusterConfig.systemPoolVmSku, // Use original VM size
                vnetSubnetID: nodeSubnet.subnet.id,
                count: 3,
                ...(args.availabilityZones && args.availabilityZones.length > 0 ? { availabilityZones: args.availabilityZones } : {}),
                nodeLabels: {
                    "node-type": "system",
                    "workload": "system"
                },
                nodeTaints: ["CriticalAddonsOnly=true:NoSchedule"]
            })
        ],
        apiServerAccessProfile: {
            privateDNSZone: '/subscriptions/742503a8-32d5-416e-b34b-463131ab235e/resourceGroups/vzn-eastus2-privatelinkdns_prod-rg-01/providers/Microsoft.Network/privateDnsZones/privatelink.eastus2.azmk8s.io',
        },
        servicePrincipalProfile: {
            clientId: aadClientSp.clientId,
            secret: aadClientSpPassword.value,
        },
    }, {
        dependsOn: [...nodeSubnet.roleAssignments],
        ignoreChanges: ['autoScalerProfile', 'agentPoolProfiles', 'securityProfile'],
    });

    const kubeconfig = args.azureBuilder.ContainerService.ManagedCluster.KubeConfig(cluster, 'Admin');

    const k8sProvider = new K8sProvider('k8s-provider', {
        kubeconfig,
    });

    const adminGroup = args.azureBuilder.AzureAD.Group.Build('admingroup', {
        displayName: `AZU-${args.clusterName}-Admin`,
        description: `Admin group for Kubernetes cluster ${args.clusterName}`,
        preventDuplicateNames: true,
    });

    args.azureBuilder.Authorization.RoleAssignment.ToGroup(
        'admingroup',
        adminGroup,
        cluster,
        'Azure Kubernetes Service RBAC Cluster Admin'
    );

    // Existing Infra Group: Hub VNet
    const vnetGroup = azuread.getGroupOutput({
        displayName: "AZU-vnet_enthub_infra_core-P-C",
    });

    // Existing Infra Group : Private DNS Zone
    const privateDnsGroup = azuread.getGroupOutput({
        displayName: "AZU-privatelinkdns_private_dns-P-C",
    });

    // Membership: AKS SPN > Hub Vnet Group
    const aksSpVnetContributor = new azuread.GroupMember('aks-sp-vnet-contributor', {
        groupObjectId: vnetGroup.id,
        memberObjectId: aadClientSp.id,
    });

    // Membership: AKS SPN > Private DNS Zone Group
    const aksSpPrivateDnsContributor = new azuread.GroupMember('aks-sp-privatedns-contributor', {
        groupObjectId: privateDnsGroup.id,
        memberObjectId: aadClientSp.id,
    });

    

    return {
        cluster,
        nodeSubnet,
        adminGroup,
        k8sProvider,
    };
}