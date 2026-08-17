import type { ComponentType, FC, ReactNode } from "react";

interface ProviderComposerProps {
    providers: Array<ComponentType<{ children: ReactNode }>>;
    children: ReactNode;
}

export const ProviderComposer: FC<ProviderComposerProps> = ({
    providers,
    children,
}) => {
    return (
        <>
            {providers.reduceRight(
                (accumulatedTree, Provider) => <Provider>{accumulatedTree}</Provider>,
                children
            )}
        </>
    );
};