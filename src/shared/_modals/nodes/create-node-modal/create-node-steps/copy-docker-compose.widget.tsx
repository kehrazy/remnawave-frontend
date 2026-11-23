import { Button, CopyButton, Group, Skeleton, Stack, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { PiCheck } from 'react-icons/pi'
import { SiDocker } from 'react-icons/si'

import { useGetNodeSecretKey } from '@shared/api/hooks'

interface IProps {
    port?: number
}

export const CopyDockerComposeWidget = ({ port }: IProps) => {
    const { data: secretKey, isLoading: isSecretKeyLoading } = useGetNodeSecretKey()
    const { t } = useTranslation()

    if (isSecretKeyLoading || !secretKey) {
        return <Skeleton height={40} />
    }

    const nodeRevision = 'ab6d6ab6830c2e411837bec3f97209d8b46dcc42'
    const imageUrl = `https://github.com/kehrazy/remnanode/releases/download/openvpn-${nodeRevision}/remnanode-openvpn.tar.gz`
    const imageCommand = `set -eu
vpn_image_tmp=$(mktemp -d)
trap 'rm -rf "$vpn_image_tmp"' EXIT
cd "$vpn_image_tmp"
curl -fL --retry 2 -o remnanode-openvpn.tar.gz ${imageUrl}
curl -fL --retry 2 -o remnanode-openvpn.tar.gz.sha256 ${imageUrl}.sha256
sha256sum -c remnanode-openvpn.tar.gz.sha256
docker load -i remnanode-openvpn.tar.gz`

    const generateDockerCompose = (port?: number) => {
        return `services:
  remnanode:
    container_name: remnanode
    hostname: remnanode
    image: remnanode-openvpn:${nodeRevision}
    pull_policy: never
    network_mode: host
    restart: always
    cap_add:
      - NET_ADMIN
    devices:
      - /dev/net/tun:/dev/net/tun
    volumes:
      - ./openvpn:/var/lib/remnanode/openvpn
      - ./amneziawg:/var/lib/remnanode/amneziawg
    ulimits:
      nofile:
        soft: 1048576
        hard: 1048576
    environment:
      - OPENVPN_ENABLED=true
      - OPENVPN_STATE_PATH=/var/lib/remnanode/openvpn
      - AMNEZIAWG_ENABLED=true
      - AMNEZIAWG_STATE_PATH=/var/lib/remnanode/amneziawg
      - NODE_PORT=${port ?? 2222}
      - SECRET_KEY="${secretKey?.secretKey.trimEnd() ?? ''}"`
    }

    return (
        <Stack mt="lg" gap="sm">
            <Text size="xs" c="dimmed">
                {t('vpn.node-install')}
            </Text>
            <CopyButton value={imageCommand}>
                {({ copied, copy }) => (
                    <Button variant="light" color={copied ? 'teal' : 'gray'} onClick={copy}>
                        {t('vpn.copy-image-command')}
                    </Button>
                )}
            </CopyButton>
            <Group>
                <CopyButton timeout={2000} value={generateDockerCompose(port)}>
                    {({ copied, copy }) => (
                        <Button
                            color={copied ? 'teal' : 'gray'}
                            fullWidth
                            leftSection={copied ? <PiCheck size={18} /> : <SiDocker size={18} />}
                            onClick={copy}
                            size="md"
                        >
                            {t('copy-docker-compose.widget.copy-docker-compose-yml')}
                        </Button>
                    )}
                </CopyButton>
            </Group>
        </Stack>
    )
}
