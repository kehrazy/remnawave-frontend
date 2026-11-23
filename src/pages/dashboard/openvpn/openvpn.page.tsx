import {
    Alert,
    Badge,
    Button,
    Group,
    Loader,
    Modal,
    MultiSelect,
    NumberInput,
    Paper,
    Select,
    Stack,
    Switch,
    Table,
    Text,
    TextInput,
    Title
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { instance } from '@shared/api'
import { useGetInternalSquads, useGetNodes } from '@shared/api/hooks'

type Endpoint = {
    uuid: string
    nodeUuid: string
    node: { uuid: string; name: string }
    name: string
    address: string
    port: number
    protocol: 'udp' | 'tcp'
    controlChannel: 'none' | 'tls-auth' | 'tls-crypt' | 'tls-crypt-v2'
    network: string
    dnsServers: string[]
    egressAddress: string | null
    relayTargetUuid: string | null
    internalSquadUuids: string[]
    isDisabled: boolean
    health: { running: boolean; error: string | null }
}

const defaults = {
    nodeUuid: '',
    name: '',
    address: '',
    port: 443,
    protocol: 'udp',
    controlChannel: 'tls-crypt-v2',
    network: '10.88.0.0/24',
    dnsServers: '1.1.1.1, 8.8.8.8',
    egressAddress: '',
    relayTargetUuid: '',
    internalSquadUuids: [] as string[],
    isDisabled: false
}

export function OpenVpnPage() {
    const client = useQueryClient()
    const { data: nodes } = useGetNodes()
    const { data: squads } = useGetInternalSquads()
    const [editor, setEditor] = useState<Endpoint | 'new' | null>(null)
    const [saving, setSaving] = useState(false)
    const form = useForm({ initialValues: defaults })
    const {
        data: endpoints = [],
        isLoading,
        error
    } = useQuery({
        queryKey: ['openvpn-endpoints'],
        queryFn: async () =>
            (await instance.get<{ response: Endpoint[] }>('/api/openvpn/endpoints')).data.response,
        refetchInterval: 5000
    })

    function openEditor(endpoint?: Endpoint) {
        form.setValues(
            endpoint
                ? {
                      ...endpoint,
                      dnsServers: endpoint.dnsServers.join(', '),
                      egressAddress: endpoint.egressAddress ?? '',
                      relayTargetUuid: endpoint.relayTargetUuid ?? ''
                  }
                : defaults
        )
        form.clearErrors()
        setEditor(endpoint ?? 'new')
    }

    return (
        <Stack p="lg">
            <Group justify="space-between">
                <Title order={2}>OpenVPN</Title>
                <Button onClick={() => openEditor()}>Add endpoint</Button>
            </Group>
            <Text c="dimmed">
                OpenVPN profiles use the existing accounts, expiry dates and shared traffic
                allowances. Downloads appear on each eligible subscription page.
            </Text>
            {error && <Alert color="red">Failed to load OpenVPN endpoints.</Alert>}
            {isLoading ? (
                <Loader />
            ) : (
                <Paper withBorder radius="md" style={{ overflowX: 'auto' }}>
                    <Table miw={800} verticalSpacing="sm">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Name</Table.Th>
                                <Table.Th>Node</Table.Th>
                                <Table.Th>Connection</Table.Th>
                                <Table.Th>Control channel</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th>Actions</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {endpoints.map((endpoint) => (
                                <Table.Tr key={endpoint.uuid}>
                                    <Table.Td>
                                        {endpoint.name}
                                        {endpoint.relayTargetUuid && (
                                            <Text c="dimmed" size="xs">
                                                Via this node
                                            </Text>
                                        )}
                                    </Table.Td>
                                    <Table.Td>{endpoint.node.name}</Table.Td>
                                    <Table.Td>
                                        {endpoint.address}:{endpoint.port} /{' '}
                                        {endpoint.protocol.toUpperCase()}
                                    </Table.Td>
                                    <Table.Td>{endpoint.controlChannel}</Table.Td>
                                    <Table.Td>
                                        <Badge
                                            color={
                                                endpoint.isDisabled
                                                    ? 'gray'
                                                    : endpoint.health.running
                                                      ? 'green'
                                                      : 'red'
                                            }
                                        >
                                            {endpoint.isDisabled
                                                ? 'Disabled'
                                                : endpoint.health.running
                                                  ? 'Running'
                                                  : 'Unavailable'}
                                        </Badge>
                                        {!endpoint.isDisabled && endpoint.health.error && (
                                            <Text c="red" maw={260} size="xs">
                                                {endpoint.health.error}
                                            </Text>
                                        )}
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap="xs" wrap="nowrap">
                                            <Button
                                                onClick={() => openEditor(endpoint)}
                                                size="xs"
                                                variant="light"
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                color={endpoint.isDisabled ? 'green' : 'gray'}
                                                onClick={async () => {
                                                    try {
                                                        await instance.patch(
                                                            `/api/openvpn/endpoints/${endpoint.uuid}`,
                                                            { isDisabled: !endpoint.isDisabled }
                                                        )
                                                        await client.invalidateQueries({
                                                            queryKey: ['openvpn-endpoints']
                                                        })
                                                    } catch {
                                                        notifications.show({
                                                            color: 'red',
                                                            message:
                                                                'Endpoint could not be changed.'
                                                        })
                                                    }
                                                }}
                                                size="xs"
                                                variant="subtle"
                                            >
                                                {endpoint.isDisabled ? 'Enable' : 'Disable'}
                                            </Button>
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                            {endpoints.length === 0 && (
                                <Table.Tr>
                                    <Table.Td colSpan={6}>
                                        <Text c="dimmed" p="md">
                                            No OpenVPN endpoints configured.
                                        </Text>
                                    </Table.Td>
                                </Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </Paper>
            )}
            <Modal
                opened={editor !== null}
                onClose={() => setEditor(null)}
                size="lg"
                title={editor === 'new' ? 'Add OpenVPN endpoint' : 'Edit OpenVPN endpoint'}
            >
                <form
                    onSubmit={form.onSubmit(async (values) => {
                        setSaving(true)
                        try {
                            const body = {
                                ...values,
                                dnsServers: values.dnsServers.split(/[,\s]+/).filter(Boolean),
                                egressAddress: values.egressAddress || null,
                                relayTargetUuid: values.relayTargetUuid || null
                            }
                            if (editor === 'new')
                                await instance.post('/api/openvpn/endpoints', body)
                            else if (editor)
                                await instance.patch(`/api/openvpn/endpoints/${editor.uuid}`, body)
                            await client.invalidateQueries({ queryKey: ['openvpn-endpoints'] })
                            setEditor(null)
                        } catch (error: unknown) {
                            const response = (
                                error as { response?: { data?: { message?: string } } }
                            ).response
                            notifications.show({
                                color: 'red',
                                message:
                                    response?.data?.message ??
                                    'Could not save the OpenVPN endpoint.'
                            })
                        } finally {
                            setSaving(false)
                        }
                    })}
                >
                    <Stack gap="md">
                        <TextInput label="Name" required {...form.getInputProps('name')} />
                        <Select
                            data={(nodes ?? []).map((node) => ({
                                value: node.uuid,
                                label: node.name
                            }))}
                            disabled={editor !== 'new'}
                            label="Node"
                            required
                            {...form.getInputProps('nodeUuid')}
                        />
                        <Select
                            clearable
                            data={endpoints
                                .filter(
                                    (endpoint) =>
                                        !endpoint.relayTargetUuid &&
                                        endpoint.nodeUuid !== form.values.nodeUuid
                                )
                                .map((endpoint) => ({
                                    value: endpoint.uuid,
                                    label: `${endpoint.name} · ${endpoint.node.name}`
                                }))}
                            description="Leave empty to run an OpenVPN server. Select an exit to relay connections through this node."
                            disabled={editor !== 'new'}
                            label="Forward to another endpoint"
                            {...form.getInputProps('relayTargetUuid')}
                        />
                        <TextInput
                            description="Public hostname or IPv4 address used in downloaded profiles."
                            label="Public address"
                            required
                            {...form.getInputProps('address')}
                        />
                        <Group grow>
                            <NumberInput
                                label="Port"
                                max={65535}
                                min={1}
                                required
                                {...form.getInputProps('port')}
                            />
                            <Select
                                data={[
                                    { value: 'udp', label: 'UDP' },
                                    { value: 'tcp', label: 'TCP' }
                                ]}
                                label="Transport"
                                required
                                {...form.getInputProps('protocol')}
                            />
                        </Group>
                        {!form.values.relayTargetUuid && (
                            <>
                                <Select
                                    data={[
                                        {
                                            value: 'none',
                                            label: 'TLS certificates only · no control-channel wrapper'
                                        },
                                        {
                                            value: 'tls-crypt-v2',
                                            label: 'tls-crypt-v2 · OpenVPN 2.5+'
                                        },
                                        { value: 'tls-crypt', label: 'tls-crypt · OpenVPN 2.4+' },
                                        {
                                            value: 'tls-auth',
                                            label: 'tls-auth · legacy control channel'
                                        }
                                    ]}
                                    disabled={editor !== 'new'}
                                    label="Control-channel protection"
                                    required
                                    {...form.getInputProps('controlChannel')}
                                />
                                <TextInput
                                    description="A distinct 10.x.x.0/24 network for each server endpoint on this node."
                                    label="Tunnel subnet"
                                    required
                                    {...form.getInputProps('network')}
                                />
                                <TextInput
                                    label="DNS servers"
                                    required
                                    {...form.getInputProps('dnsServers')}
                                />
                                <TextInput
                                    description="Optional IPv4 address for internet egress. Leave empty to use the node’s normal outbound address."
                                    label="Egress address"
                                    {...form.getInputProps('egressAddress')}
                                />
                            </>
                        )}
                        <MultiSelect
                            clearable
                            data={(squads?.internalSquads ?? []).map((squad) => ({
                                value: squad.uuid,
                                label: squad.name
                            }))}
                            description="Empty grants access to all active accounts. Account expiry and traffic limits always apply."
                            label="Internal squads"
                            {...form.getInputProps('internalSquadUuids')}
                        />
                        <Switch
                            label="Disabled"
                            {...form.getInputProps('isDisabled', { type: 'checkbox' })}
                        />
                        <Button loading={saving} type="submit">
                            Save
                        </Button>
                    </Stack>
                </form>
            </Modal>
        </Stack>
    )
}
