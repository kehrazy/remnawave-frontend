import { Badge, Button, Group, Stack, Text } from '@mantine/core'
import { GetNodeCommand, NodeEngine } from '@remnawave/backend-contract'
import { useTranslation } from 'react-i18next'
import { TbRefresh } from 'react-icons/tb'
import { generatePath, Link } from 'react-router'

import { queryClient } from '@shared/api'
import { QueryKeys } from '@shared/api/hooks'
import { useRestartNodeEngine } from '@shared/api/hooks/nodes/nodes.mutation.hooks'
import { ROUTES } from '@shared/constants'
import { SectionCard } from '@shared/ui/section-card'
import { getXrayUptimeUtil } from '@shared/utils/time-utils'

export function EngineStatusBadges({ engines }: { engines: NodeEngine[] }) {
    const { t } = useTranslation()
    return (
        <Group gap={6}>
            {engines
                .filter((engine) =>
                    engine.profiles.some((profile) =>
                        profile.inbounds.some((inbound) => inbound.assigned)
                    )
                )
                .map((engine) => (
                    <Badge
                        key={engine.type}
                        size="sm"
                        variant="light"
                        color={
                            engine.running
                                ? engine.profiles.some((profile) =>
                                      profile.inbounds.some(
                                          (inbound) => inbound.enabled && inbound.error
                                      )
                                  )
                                    ? 'yellow'
                                    : 'teal'
                                : 'gray'
                        }
                        title={`${engine.version ?? ''} · ${engine.running ? getXrayUptimeUtil(engine.uptime) : t('vpn.stopped')}`}
                    >
                        {engine.type === 'xray'
                            ? 'Xray'
                            : engine.type === 'openvpn'
                              ? 'OpenVPN'
                              : 'AmneziaWG'}
                    </Badge>
                ))}
        </Group>
    )
}

export function NodeEnginesWidget({ node }: { node: GetNodeCommand.Response['response'] }) {
    const { t } = useTranslation()
    const { mutate: restart, isPending } = useRestartNodeEngine({
        mutationFns: {
            onSuccess: () => {
                void queryClient.invalidateQueries({ queryKey: QueryKeys.nodes._def })
            }
        }
    })
    return (
        <SectionCard.Root>
            <SectionCard.Section>
                <Group justify="space-between">
                    <Text fw={600}>{t('vpn.services')}</Text>
                    <EngineStatusBadges engines={node.engines} />
                </Group>
            </SectionCard.Section>
            {node.engines
                .filter((engine) => engine.profiles.length)
                .map((engine) => (
                    <SectionCard.Section key={engine.type}>
                        <Stack gap="sm">
                            <Group justify="space-between">
                                <Group gap="sm">
                                    <Text fw={600}>
                                        {engine.type === 'xray'
                                            ? 'Xray'
                                            : engine.type === 'openvpn'
                                              ? 'OpenVPN'
                                              : 'AmneziaWG'}
                                    </Text>
                                    <Text ff="monospace" c="dimmed" size="xs">
                                        {engine.version ?? '—'}
                                    </Text>
                                </Group>
                                <Button
                                    size="compact-xs"
                                    variant="subtle"
                                    disabled={node.isDisabled || !engine.enabled}
                                    loading={isPending}
                                    leftSection={<TbRefresh />}
                                    onClick={() => {
                                        if (window.confirm(t('vpn.restart-confirm')))
                                            restart({
                                                route: { uuid: node.uuid, engine: engine.type }
                                            })
                                    }}
                                >
                                    {t('restart-node-button.feature.restart')}
                                </Button>
                            </Group>
                            <Text size="xs" c="dimmed">
                                {engine.running
                                    ? `${t('vpn.running')} · ${getXrayUptimeUtil(engine.uptime)}`
                                    : t('vpn.stopped')}{' '}
                                · {t('vpn.online-users', { count: engine.usersOnline })}
                            </Text>
                            {engine.profiles.map((profile) => (
                                <Stack key={profile.uuid} gap={4}>
                                    <Text
                                        component={Link}
                                        to={generatePath(
                                            ROUTES.DASHBOARD.MANAGEMENT.CONFIG_PROFILE_BY_UUID,
                                            { uuid: profile.uuid }
                                        )}
                                        size="sm"
                                        c="cyan"
                                    >
                                        {profile.name}
                                    </Text>
                                    {profile.inbounds
                                        .filter((inbound) => inbound.assigned)
                                        .map((inbound) => (
                                            <Stack key={inbound.uuid} gap={2}>
                                                <Group gap="xs">
                                                    <Badge
                                                        size="xs"
                                                        color={
                                                            inbound.error
                                                                ? 'red'
                                                                : inbound.running
                                                                  ? 'teal'
                                                                  : 'gray'
                                                        }
                                                    >
                                                        {inbound.running
                                                            ? t('vpn.running')
                                                            : t('vpn.stopped')}
                                                    </Badge>
                                                    <Text size="xs" ff="monospace">
                                                        {inbound.tag} ·{' '}
                                                        {inbound.transport?.toUpperCase()} :
                                                        {inbound.port}
                                                    </Text>
                                                    {inbound.mode === 'relay' && (
                                                        <Text size="xs" c="dimmed">
                                                            {t('vpn.relay')}
                                                        </Text>
                                                    )}
                                                </Group>
                                                {inbound.hosts.map((host) => (
                                                    <Text key={host.uuid} size="xs" c="dimmed">
                                                        {host.remark} · {host.address}:{host.port}
                                                    </Text>
                                                ))}
                                                {inbound.error && (
                                                    <Text size="xs" c="red">
                                                        {inbound.error}
                                                    </Text>
                                                )}
                                            </Stack>
                                        ))}
                                </Stack>
                            ))}
                        </Stack>
                    </SectionCard.Section>
                ))}
        </SectionCard.Root>
    )
}
