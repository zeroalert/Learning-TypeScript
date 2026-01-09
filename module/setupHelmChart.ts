import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { readFileSync } from "fs";
import * as yaml from "js-yaml";

interface SetupHelmChartsArgs {
  k8sProvider: k8s.Provider;
  namespace: pulumi.Input<string>;
  dependsOn?: pulumi.Input<pulumi.Resource[]>;
  valuesFilePath?: string;
  chartVersion?: string;
}

export const setupHelmChart = ({
  k8sProvider,
  namespace,
  dependsOn,
  valuesFilePath = "./helm/atscale-values.yaml",
  chartVersion = "2025.12.0",
}: SetupHelmChartsArgs) => {
  const valuesYaml = readFileSync(valuesFilePath, "utf-8");
  const values = yaml.load(valuesYaml) as Record<string, any>;

  const atScaleChart = new k8s.helm.v3.Chart(
    "atscale",
    {
      chart: "oci://docker.io/atscaleinc/atscale",
      version: chartVersion,
      namespace: namespace,
      values: values,
    },
    {
      provider: k8sProvider,
      dependsOn: dependsOn,
    }
  );

  return { atScaleChart };
};
