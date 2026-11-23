import { Button, Group, Stack } from '@mantine/core'
import { UseFormReturnType } from '@mantine/form'
import { CreateNodeCommand } from '@remnawave/backend-contract'
import { useTranslation } from 'react-i18next'
import { PiArrowLeft } from 'react-icons/pi'
import { SiSecurityscorecard } from 'react-icons/si'
import { TbCheck } from 'react-icons/tb'

import { NodeProfileAssignments } from '@shared/ui/forms/nodes/base-node-form/node-profile-assignments'
import { BaseOverlayHeader } from '@shared/ui/overlays/base-overlay-header'
import { SectionCard } from '@shared/ui/section-card'

import { CopyDockerComposeWidget } from './copy-docker-compose.widget'

interface IProps {
    // oxlint-disable-next-line
    form: UseFormReturnType<CreateNodeCommand.RequestBody, any>
    isCreating: boolean
    onCreateNode: () => void
    onPrev: () => void
    port: number
}

export const CreateNodeStep2ConfigProfiles = ({
    form,
    isCreating,
    onCreateNode,
    onPrev,
    port
}: IProps) => {
    const { t } = useTranslation()

    const handleCreateNode = () => {
        if (!form.validate().hasErrors) onCreateNode()
    }

    return (
        <Stack gap="xl" mih={400}>
            <SectionCard.Root>
                <SectionCard.Section>
                    <BaseOverlayHeader
                        iconColor="teal"
                        IconComponent={SiSecurityscorecard}
                        iconVariant="soft"
                        title={t('base-node-form.core-configuration')}
                        titleOrder={5}
                    />
                </SectionCard.Section>
                <SectionCard.Section>
                    <NodeProfileAssignments form={form} />
                </SectionCard.Section>
            </SectionCard.Root>

            <Stack gap="xs" mt="auto">
                <CopyDockerComposeWidget port={port} />

                <Group justify="space-between">
                    <Button
                        color="gray"
                        leftSection={<PiArrowLeft size={18} />}
                        onClick={onPrev}
                        size="md"
                    >
                        {t('create-node-modal.widget.back')}
                    </Button>
                    <Button
                        color="teal"
                        leftSection={<TbCheck size={18} />}
                        loading={isCreating}
                        onClick={handleCreateNode}
                        size="md"
                        type="submit"
                    >
                        {t('create-node-modal.widget.create-node')}
                    </Button>
                </Group>
            </Stack>
        </Stack>
    )
}
