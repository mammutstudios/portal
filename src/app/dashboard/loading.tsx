import PageSkeleton from "@/components/PageSkeleton";

/**
 * Deze grens is niet alleen kosmetisch: loading.tsx maakt een <Suspense> om het
 * paginasegment heen. Daardoor kan Next de schil eromheen alvast uitleveren en
 * blijft er nooit een leeg scherm staan wachten op de traagste query.
 */
export default function Loading() {
  return <PageSkeleton />;
}
