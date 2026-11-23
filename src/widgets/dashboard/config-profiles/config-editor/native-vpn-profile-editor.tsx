import {
    ActionIcon,
    Alert,
    Badge,
    Button,
    Group,
    JsonInput,
    NumberInput,
    Select,
    Stack,
    Text,
    TextInput
} from '@mantine/core'
import {
    GetConfigProfileByUuidCommand,
    NativeVpnInbound,
    parseNativeVpnConfig
} from '@remnawave/backend-contract'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TbPlus, TbTrash } from 'react-icons/tb'
import { useBlocker } from 'react-router'

import { useGetConfigProfiles, useGetHosts } from '@shared/api/hooks'
import { useUpdateConfigProfile } from '@shared/api/hooks/config-profiles/config-profiles.mutation.hooks'
import { SectionCard } from '@shared/ui/section-card'

export function NativeVpnProfileEditor({
    configProfile
}: {
    configProfile: GetConfigProfileByUuidCommand.Response['response']
}) {
    const { t } = useTranslation()
    const engine = configProfile.engine === 'openvpn' ? 'openvpn' : 'amneziawg'
    const [config, setConfig] = useState(() => parseNativeVpnConfig(engine, configProfile.config))
    const [saved, setSaved] = useState(() => JSON.stringify(config))
    const [invalidParameters, setInvalidParameters] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { data: hosts } = useGetHosts()
    const { data: profiles } = useGetConfigProfiles()
    const dirty = JSON.stringify(config) !== saved
    const blocker = useBlocker(dirty)
    const { mutate: update, isPending } = useUpdateConfigProfile({
        mutationFns: {
            onSuccess: () => {
                setSaved(JSON.stringify(config))
                setError(null)
            }
        }
    })
    const serverInbounds = new Set(
        profiles?.configProfiles
            .filter((profile) => profile.engine === engine)
            .flatMap((profile) =>
                profile.inbounds
                    .filter(
                        (inbound) => (inbound.rawInbound as { mode?: string }).mode === 'server'
                    )
                    .map((inbound) => inbound.uuid)
            ) ?? []
    )
    const targets = (hosts ?? [])
        .filter(
            (host) =>
                host.inbound.configProfileInboundUuid &&
                serverInbounds.has(host.inbound.configProfileInboundUuid)
        )
        .map((host) => ({
            value: host.uuid,
            label: `${host.remark} · ${host.address}:${host.port}`
        }))

    const change = (index: number, patch: Partial<NativeVpnInbound>) =>
        setConfig((current) => ({
            inbounds: current.inbounds.map((inbound, position) =>
                position === index ? ({ ...inbound, ...patch } as NativeVpnInbound) : inbound
            )
        }))

    return (
        <Stack gap="md">
            {blocker.state === 'blocked' && (
                <Alert color="yellow" title={t('config-editor.widget.unsaved-changes')}>
                    <Group mt="sm">
                        <Button color="red" onClick={() => blocker.proceed()}>
                            {t('config-editor.widget.leave')}
                        </Button>
                        <Button variant="light" onClick={() => blocker.reset()}>
                            {t('config-editor.widget.stay')}
                        </Button>
                    </Group>
                </Alert>
            )}
            <Text c="dimmed" size="sm">
                {t('vpn.profile-workflow')}
            </Text>
            {config.inbounds.map((inbound, index) => {
                const assigned =
                    configProfile.nodes.length > 0 &&
                    configProfile.inbounds.some((entry) => entry.tag === inbound.tag)
                return (
                    <SectionCard.Root key={index}>
                        <SectionCard.Section>
                            <Group justify="space-between">
                                <Group>
                                    <Badge>{engine === 'openvpn' ? 'OpenVPN' : 'AmneziaWG'}</Badge>
                                    <Text fw={600}>{inbound.tag}</Text>
                                </Group>
                                <ActionIcon
                                    aria-label={t('common.action.delete')}
                                    color="red"
                                    variant="subtle"
                                    disabled={config.inbounds.length === 1}
                                    onClick={() =>
                                        setConfig({
                                            inbounds: config.inbounds.filter(
                                                (_, position) => position !== index
                                            )
                                        })
                                    }
                                >
                                    <TbTrash />
                                </ActionIcon>
                            </Group>
                        </SectionCard.Section>
                        <SectionCard.Section>
                            <Stack gap="md">
                                <Group grow>
                                    <TextInput
                                        label={t('vpn.listener-tag')}
                                        value={inbound.tag}
                                        disabled={assigned}
                                        onChange={(event) =>
                                            change(index, { tag: event.currentTarget.value })
                                        }
                                    />
                                    <NumberInput
                                        label={t('common.field.port')}
                                        value={inbound.port}
                                        min={1}
                                        max={65535}
                                        allowDecimal={false}
                                        onChange={(value) => change(index, { port: Number(value) })}
                                    />
                                </Group>
                                <Select
                                    label={t('vpn.role')}
                                    value={inbound.mode}
                                    disabled={assigned}
                                    allowDeselect={false}
                                    data={[
                                        { value: 'server', label: t('vpn.server') },
                                        { value: 'relay', label: t('vpn.relay') }
                                    ]}
                                    onChange={(value) => {
                                        if (value === 'relay')
                                            setConfig({
                                                inbounds: config.inbounds.map((entry, position) =>
                                                    position === index
                                                        ? {
                                                              type: engine,
                                                              mode: 'relay',
                                                              tag: entry.tag,
                                                              port: entry.port,
                                                              relayTargetUuid:
                                                                  targets[0]?.value ?? ''
                                                          }
                                                        : entry
                                                )
                                            })
                                        else
                                            setConfig({
                                                inbounds: config.inbounds.map((entry, position) =>
                                                    position === index
                                                        ? parseNativeVpnConfig(engine, {
                                                              inbounds: [
                                                                  {
                                                                      type: engine,
                                                                      mode: 'server',
                                                                      tag: entry.tag,
                                                                      port: entry.port,
                                                                      network: `10.100.${index}.0/24`
                                                                  }
                                                              ]
                                                          }).inbounds[0]
                                                        : entry
                                                )
                                            })
                                    }}
                                />
                                {inbound.mode === 'relay' ? (
                                    <Select
                                        searchable
                                        label={t('vpn.exit-host')}
                                        description={t('vpn.relay-hint')}
                                        value={inbound.relayTargetUuid}
                                        data={targets}
                                        onChange={(value) =>
                                            change(index, { relayTargetUuid: value ?? '' })
                                        }
                                    />
                                ) : (
                                    <>
                                        <TextInput
                                            label={t('vpn.pool')}
                                            disabled={assigned}
                                            value={inbound.network}
                                            onChange={(event) =>
                                                change(index, {
                                                    network: event.currentTarget.value
                                                })
                                            }
                                        />
                                        <TextInput
                                            label="DNS"
                                            value={inbound.dnsServers.join(', ')}
                                            onChange={(event) =>
                                                change(index, {
                                                    dnsServers: event.currentTarget.value
                                                        .split(',')
                                                        .map((value) => value.trim())
                                                })
                                            }
                                        />
                                        <TextInput
                                            label={t('vpn.egress')}
                                            value={inbound.egressAddress ?? ''}
                                            onChange={(event) =>
                                                change(index, {
                                                    egressAddress: event.currentTarget.value || null
                                                })
                                            }
                                        />
                                        {inbound.type === 'openvpn' ? (
                                            <>
                                                <Group grow>
                                                    <Select
                                                        label={t('vpn.transport')}
                                                        value={inbound.transport}
                                                        data={['udp', 'tcp']}
                                                        allowDeselect={false}
                                                        onChange={(value) =>
                                                            change(index, {
                                                                transport: value as 'udp' | 'tcp'
                                                            })
                                                        }
                                                    />
                                                    <Select
                                                        label={t('vpn.control-channel')}
                                                        value={inbound.controlChannel}
                                                        disabled={assigned}
                                                        data={[
                                                            'none',
                                                            'tls-auth',
                                                            'tls-crypt',
                                                            'tls-crypt-v2'
                                                        ]}
                                                        allowDeselect={false}
                                                        onChange={(value) =>
                                                            change(index, {
                                                                controlChannel:
                                                                    value as typeof inbound.controlChannel
                                                            })
                                                        }
                                                    />
                                                </Group>
                                                {inbound.transport === 'udp' && (
                                                    <Select
                                                        label={t('vpn.udp-mask')}
                                                        value={inbound.udpMask}
                                                        data={[
                                                            'none',
                                                            'random',
                                                            'strong',
                                                            'error-free'
                                                        ]}
                                                        allowDeselect={false}
                                                        onChange={(value) =>
                                                            change(index, {
                                                                udpMask:
                                                                    value as typeof inbound.udpMask
                                                            })
                                                        }
                                                    />
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <Group grow>
                                                    <Select
                                                        label={t('vpn.generation')}
                                                        value={inbound.generation}
                                                        disabled={assigned}
                                                        data={['3.1', '2.0']}
                                                        allowDeselect={false}
                                                        onChange={(value) =>
                                                            change(index, {
                                                                generation: value as '3.1' | '2.0'
                                                            })
                                                        }
                                                    />
                                                    <Select
                                                        label={t('vpn.preset')}
                                                        value={inbound.preset}
                                                        disabled={assigned}
                                                        data={['default', 'mobile']}
                                                        allowDeselect={false}
                                                        onChange={(value) =>
                                                            change(index, {
                                                                preset: value as
                                                                    | 'default'
                                                                    | 'mobile'
                                                            })
                                                        }
                                                    />
                                                </Group>
                                                <JsonInput
                                                    label={t('vpn.parameters')}
                                                    formatOnBlur
                                                    autosize
                                                    minRows={3}
                                                    disabled={assigned}
                                                    defaultValue={JSON.stringify(
                                                        inbound.parameters,
                                                        null,
                                                        2
                                                    )}
                                                    onChange={(value) => {
                                                        try {
                                                            change(index, {
                                                                parameters: JSON.parse(value)
                                                            })
                                                            setInvalidParameters(false)
                                                            setError(null)
                                                        } catch {
                                                            setInvalidParameters(true)
                                                            setError(t('vpn.invalid-json'))
                                                        }
                                                    }}
                                                />
                                            </>
                                        )}
                                        {assigned && (
                                            <Text c="dimmed" size="xs">
                                                {t('vpn.identity-locked')}
                                            </Text>
                                        )}
                                    </>
                                )}
                            </Stack>
                        </SectionCard.Section>
                    </SectionCard.Root>
                )
            })}
            {error && <Alert color="red">{error}</Alert>}
            <Group justify="space-between">
                <Button
                    variant="light"
                    leftSection={<TbPlus />}
                    onClick={() =>
                        setConfig({
                            inbounds: [
                                ...config.inbounds,
                                parseNativeVpnConfig(engine, {
                                    inbounds: [
                                        {
                                            type: engine,
                                            mode: 'server',
                                            tag: `${engine}_${Date.now()}`,
                                            port: 10000 + config.inbounds.length,
                                            network: `10.100.${config.inbounds.length}.0/24`
                                        }
                                    ]
                                }).inbounds[0]
                            ]
                        })
                    }
                >
                    {t('vpn.add-listener')}
                </Button>
                <Button
                    disabled={!dirty || invalidParameters}
                    loading={isPending}
                    onClick={() => {
                        try {
                            const parsed = parseNativeVpnConfig(engine, config)
                            update({ variables: { uuid: configProfile.uuid, config: parsed } })
                        } catch (failure) {
                            setError(failure instanceof Error ? failure.message : String(failure))
                        }
                    }}
                >
                    {t('common.action.save')}
                </Button>
            </Group>
        </Stack>
    )
}
