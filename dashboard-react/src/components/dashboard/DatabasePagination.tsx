import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "../ui/button"

interface DatabasePaginationProps {
  page: number; totalPages: number; totalItems: number
  onPageChange: (page: number) => void
}

export default function DatabasePagination({ page, totalPages, totalItems, onPageChange }: DatabasePaginationProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700/50">
      <span className="text-xs text-dark-500">{totalItems} transactions au total</span>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))} leftIcon={<ChevronLeft size={14} />}>
          Precedent
        </Button>
        <span className="text-xs text-dark-400 tabular-nums px-2">{page} / {totalPages}</span>
        <Button variant="ghost" size="sm" disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))} rightIcon={<ChevronRight size={14} />}>
          Suivant
        </Button>
      </div>
    </div>
  )
}
