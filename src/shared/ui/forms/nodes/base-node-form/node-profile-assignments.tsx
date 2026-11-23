import { Badge, Checkbox, Group, MultiSelect, Select, Stack, Text } from '@mantine/core'
import { UseFormReturnType } from '@mantine/form'
import { CreateNodeCommand, UpdateNodeCommand } from '@remnawave/backend-contract'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useGetConfigProfiles } from '@shared/api/hooks'

type NodeForm = CreateNodeCommand.RequestBody | UpdateNodeCommand.RequestBody

export function NodeProfileAssignments<T extends NodeForm>({
    form,
    canClear = false
}: {
    form: UseFormReturnType<T>
    canClear?: boolean
}) {
    const { t } = useTranslation()
    const { data } = useGetConfigProfiles()
    const [xray, setXray] = useState(form.getValues().configProfile)
    const [native, setNative] = useState(form.getValues().nativeInbounds ?? [])
    form.watch('configProfile', ({ value }) => setXray(value))
    form.watch('nativeInbounds', ({ value }) => setNative(value ?? []))
    const profiles = data?.configProfiles ?? []
    const selected = profiles.find((profile) => profile.uuid === xray?.activeConfigProfileUuid)

    return (
        <Stack gap="lg">
            <Stack gap="xs">
                <Select
                    label="Xray"
                    searchable
                    clearable={canClear}
                    value={xray?.activeConfigProfileUuid || null}
                    data={profiles
                        .filter((profile) => profile.engine === 'xray')
                        .map((profile) => ({ value: profile.uuid, label: profile.name }))}
                    onChange={(value) => {
                        const profile = value
                            ? { activeConfigProfileUuid: value, activeInbounds: [] }
                            : canClear
                              ? null
                              : undefined
                        setXray(profile)
                        form.setFieldValue('configProfile', profile as never)
                    }}
                />
                {selected && (
                    <MultiSelect
                        label={t('common.field.inbounds')}
                        value={xray?.activeInbounds ?? []}
                        data={selected.inbounds.map((inbound) => ({
                            value: inbound.uuid,
                            label: `${inbound.tag} · ${inbound.port ?? ''}`
                        }))}
                        onChange={(values) => {
                            const profile = {
                                activeConfigProfileUuid: selected.uuid,
                                activeInbounds: values
                            }
                            setXray(profile)
                            form.setFieldValue('configProfile', profile as never)
                        }}
                    />
                )}
            </Stack>
            {(['openvpn', 'amneziawg'] as const).map((engine) => (
                <Stack key={engine} gap="sm">
                    <Group justify="space-between">
                        <Text fw={600}>{engine === 'openvpn' ? 'OpenVPN' : 'AmneziaWG'}</Text>
                        <Badge variant="light">
                            {
                                native.filter((uuid) =>
                                    profiles.some(
                                        (profile) =>
                                            profile.engine === engine &&
                                            profile.inbounds.some(
                                                (inbound) => inbound.uuid === uuid
                                            )
                                    )
                                ).length
                            }
                        </Badge>
                    </Group>
                    {profiles
                        .filter((profile) => profile.engine === engine)
                        .map((profile) => (
                            <Stack key={profile.uuid} gap="xs">
                                <Text size="sm" c="dimmed">
                                    {profile.name}
                                </Text>
                                {profile.inbounds.map((inbound) => (
                                    <Checkbox
                                        key={inbound.uuid}
                                        label={`${inbound.tag} · ${inbound.port ?? ''}`}
                                        checked={native.includes(inbound.uuid)}
                                        onChange={(event) => {
                                            const values = event.currentTarget.checked
                                                ? [...native, inbound.uuid]
                                                : native.filter((uuid) => uuid !== inbound.uuid)
                                            setNative(values)
                                            form.setFieldValue('nativeInbounds', values as never)
                                        }}
                                    />
                                ))}
                            </Stack>
                        ))}
                    {!profiles.some((profile) => profile.engine === engine) && (
                        <Text size="sm" c="dimmed">
                            {t('vpn.no-profiles')}
                        </Text>
                    )}
                </Stack>
            ))}
            <Text c="dimmed" size="xs">
                {t('vpn.assignment-hint')}
            </Text>
        </Stack>
    )
}
