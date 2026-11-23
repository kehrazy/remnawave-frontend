import { Stack, TextInput, Group, Button, Text, Select } from '@mantine/core'
import { useField } from '@mantine/form'
import { CreateConfigProfileCommand } from '@remnawave/backend-contract'
import { t } from 'i18next'
import { useState } from 'react'
import { generatePath, NavigateFunction } from 'react-router'

import { queryClient } from '@shared/api'
import { useCreateConfigProfile } from '@shared/api/hooks/config-profiles/config-profiles.mutation.hooks'
import { QueryKeys } from '@shared/api/hooks/keys-factory'
import { ROUTES } from '@shared/constants/routes'

interface IProps {
    onClose: () => void
    navigate: NavigateFunction
}

const generateDefaultConfig = () => {
    const randomNumber = Math.floor(Math.random() * 999999) + 1

    return {
        log: {
            loglevel: 'info'
        },
        inbounds: [
            {
                tag: `Shadowsocks_${randomNumber}`,
                port: 1234,
                protocol: 'shadowsocks',
                settings: {
                    clients: [],
                    method: 'chacha20-ietf-poly1305',
                    network: 'tcp,udp'
                },
                sniffing: {
                    enabled: true,
                    destOverride: ['http', 'tls', 'quic']
                }
            }
        ],
        outbounds: [
            {
                protocol: 'freedom',
                tag: 'DIRECT'
            },
            {
                protocol: 'blackhole',
                tag: 'BLOCK'
            }
        ],
        routing: {
            rules: []
        }
    }
}

export const CreateConfigProfileContent = (props: IProps) => {
    const { onClose, navigate } = props
    const [engine, setEngine] = useState<CreateConfigProfileCommand.RequestBody['engine']>('xray')

    const handleUpdate = async () => {
        await queryClient.refetchQueries({
            queryKey: QueryKeys.configProfiles.getConfigProfiles.queryKey
        })
    }

    const nameField = useField<CreateConfigProfileCommand.RequestBody['name']>({
        initialValue: '',
        validateOnChange: true,
        validate: (value) => {
            const result = CreateConfigProfileCommand.RequestBodySchema.omit({
                config: true
            }).safeParse({ name: value })
            return result.success ? null : result.error.issues[0]?.message
        }
    })
    const { mutate: createConfigProfile, isPending } = useCreateConfigProfile({
        mutationFns: {
            onSuccess: (data) => {
                onClose()

                handleUpdate()
                navigate(
                    generatePath(ROUTES.DASHBOARD.MANAGEMENT.CONFIG_PROFILE_BY_UUID, {
                        uuid: data.uuid
                    })
                )
            }
        }
    })

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault()
                createConfigProfile({
                    variables: {
                        name: nameField.getValue(),
                        engine,
                        config:
                            engine === 'xray'
                                ? generateDefaultConfig()
                                : {
                                      inbounds: [
                                          {
                                              type: engine,
                                              mode: 'server',
                                              tag:
                                                  engine +
                                                  '_' +
                                                  crypto.randomUUID().replaceAll('-', ''),
                                              port: engine === 'openvpn' ? 1194 : 5443,
                                              network: '10.100.0.0/24',
                                              dnsServers: ['1.1.1.1'],
                                              egressAddress: null,
                                              ...(engine === 'openvpn'
                                                  ? {
                                                        transport: 'udp',
                                                        controlChannel: 'tls-crypt-v2',
                                                        udpMask: 'none'
                                                    }
                                                  : {
                                                        generation: '3.1',
                                                        preset: 'default',
                                                        parameters: {}
                                                    })
                                          }
                                      ]
                                  }
                    }
                })
            }}
        >
            <Stack gap="md">
                <Text size="sm">
                    {t(
                        'config-profiles-header-action-buttons.feature.create-a-new-config-profile-by-entering-a-name-below'
                    )}
                    <br />

                    {t('vpn.profile-edit-hint')}
                </Text>
                <Select
                    label={t('vpn.engine')}
                    value={engine}
                    allowDeselect={false}
                    data={[
                        { value: 'xray', label: 'Xray' },
                        { value: 'openvpn', label: 'OpenVPN' },
                        { value: 'amneziawg', label: 'AmneziaWG' }
                    ]}
                    onChange={(value) => setEngine(value as typeof engine)}
                />
                <TextInput
                    data-autofocus
                    label={t('config-profiles-header-action-buttons.feature.profile-name')}
                    placeholder={t(
                        'config-profiles-header-action-buttons.feature.enter-profile-name'
                    )}
                    required
                    {...nameField.getInputProps()}
                />
                <Group justify="flex-end">
                    <Button color="gray" onClick={onClose} variant="light">
                        {t('common.action.cancel')}
                    </Button>

                    <Button color="teal" loading={isPending} type="submit">
                        {t('common.action.create')}
                    </Button>
                </Group>
            </Stack>
        </form>
    )
}
