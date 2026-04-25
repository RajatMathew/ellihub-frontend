import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Check,
  X,
  Trash2, 
  EllipsisVertical, 
  Pencil,
} from 'lucide-react';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';
import { Button } from '@app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@app/components/ui/card';
import { Badge } from '@app/components/ui/badge';
import { Separator } from '@app/components/ui/separator';
import { Textarea } from '@app/components/ui/textarea';
import { 
  usePTODetailQuery, 
  useApprovePTOMutation, 
  useRejectPTOMutation,
  useDeletePTOMutation
} from '../../hooks/pto.hooks';
import { formatDate } from '@app/lib/helpers';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function PTODetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState(false);

  const { data: pto, isLoading } = usePTODetailQuery(id ?? '');
  const approveMutation = useApprovePTOMutation();
  const rejectMutation = useRejectPTOMutation();
  const deleteMutation = useDeletePTOMutation();

  const handleDecision = (type: 'approve' | 'reject') => {
    if (!note.trim()) {
      setNoteError(true);
      toast.error('Internal note is required for this decision');
      return;
    }
    setNoteError(false);

    const mutation = type === 'approve' ? approveMutation : rejectMutation;
    mutation.mutate({ id: pto!.id, note }, {
      onSuccess: () => {
        setNote('');
      }
    });
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this time off request?')) {
      await deleteMutation.mutateAsync(pto!.id);
      navigate('..');
    }
  };

  if (isLoading) {
    return (
      <div className="container-fluid py-7.5">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
          <div className="size-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Loading Details...
          </div>
        </div>
      </div>
    );
  }

  if (!pto) {
    return (
      <div className="container-fluid py-7.5 text-center">
        <div className="text-sm text-destructive uppercase tracking-widest mt-20">
          Request not found.
        </div>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('..')}>
          Back to List
        </Button>
      </div>
    );
  }

  const isPending = pto.status === 'PENDING';
  
  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
    APPROVED: 'bg-green-500/10 text-green-600 border-green-200',
    REJECTED: 'bg-red-500/10 text-red-600 border-red-200',
  };

  return (
    <div className="container-fluid py-7.5">
      <Toolbar sticky={false}>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-1">
              HR / Time Off / Request Detail
            </div>
            <ToolbarPageTitle>
              <div className="flex items-center gap-3">
                <span>PTO-{pto.id.substring(pto.id.length - 6).toUpperCase()}</span>
                <Badge className={`text-[10px] font-bold uppercase border ${statusColors[pto.status]}`}>
                  {pto.status}
                </Badge>
              </div>
            </ToolbarPageTitle>
          </ToolbarHeading>
          <ToolbarActions>
            {isPending && (
              <Button variant="outline" size="sm" asChild>
                <Link to="edit">
                  <Pencil className="size-4 mr-2" />
                  Modify
                </Link>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" mode="icon" size="sm" className="size-8">
                  <EllipsisVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {isPending && (
                  <DropdownMenuItem asChild>
                    <Link to="edit">
                      <Pencil className="size-4 mr-2" />
                      Edit Request
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                  <Trash2 className="size-4 mr-2" />
                  Delete Request
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-6">
        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-xs font-semibold tracking-widest uppercase">
                Request Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-4 space-y-8">
              {/* High-Density Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-label-light uppercase tracking-widest">Leave Type</span>
                  <div>
                    <Badge variant="outline" className="font-bold uppercase bg-primary/5 text-primary border-primary/20">
                      {pto.type?.label || 'Vacation'}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-label-light uppercase tracking-widest">Total Duration</span>
                  <div className="text-sm font-bold uppercase tracking-tight text-foreground">
                    {calculateDays(pto.startDate, pto.endDate)} Days
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-label-light uppercase tracking-widest">Start Date</span>
                  <div className="text-sm font-bold uppercase tracking-tight text-foreground">
                    {formatDate(pto.startDate, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-label-light uppercase tracking-widest">End Date</span>
                  <div className="text-sm font-bold uppercase tracking-tight text-foreground">
                    {formatDate(pto.endDate, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>

              <Separator className="opacity-50" />

              {/* Reason Section */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-label-light uppercase tracking-widest">Reason / Justification</span>
                <div className="text-sm text-foreground bg-muted/20 p-5 rounded-lg border border-separator italic leading-relaxed">
                  "{pto.reason || 'No justification provided.'}"
                </div>
              </div>

              {/* Decision Area */}
              {isPending && (
                <div className="mt-8 p-6 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
                   <div className="flex items-center justify-between">
                     <div className="text-[11px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                       Decision Management
                       <span className="text-destructive font-black">*</span>
                     </div>
                     {noteError && (
                       <span className="text-[10px] font-bold text-destructive uppercase tracking-widest animate-pulse">
                         Internal note is required
                       </span>
                     )}
                   </div>
                   <Textarea 
                      placeholder="Add an internal note for this decision... (Mandatory)"
                      value={note}
                      onChange={(e) => {
                        setNote(e.target.value);
                        if (e.target.value.trim()) setNoteError(false);
                      }}
                      className={`min-h-[100px] resize-none text-sm bg-background transition-colors ${
                        noteError 
                          ? 'border-destructive focus:ring-destructive/20 placeholder:text-destructive/40 shadow-[0_0_0_1px_rgba(239,68,68,0.1)]' 
                          : 'border-primary/20 focus:ring-primary/20'
                      }`}
                    />
                    <div className="flex items-center gap-3">
                      <Button 
                        className="flex-1 h-11 font-bold uppercase tracking-widest text-[11px]" 
                        variant="primary"
                        onClick={() => handleDecision('approve')}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        <Check className="size-4 mr-2" />
                        Approve Request
                      </Button>
                      <Button 
                        className="flex-1 h-11 font-bold uppercase tracking-widest text-[11px]" 
                        variant="destructive"
                        onClick={() => handleDecision('reject')}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        <X className="size-4 mr-2" />
                        Reject Request
                      </Button>
                    </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Area */}
        <div className="lg:col-span-1 space-y-6">
          {/* Simple Employee Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-widest uppercase">
                Employee Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="pb-3 border-b border-separator">
                <span className="text-[11px] font-semibold text-label-light block mb-0.5 uppercase tracking-wider text-[10px]">Staff Member</span>
                <div className="text-sm font-bold uppercase text-foreground">{pto.employee?.name}</div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-separator">
                <div>
                  <span className="text-[10px] font-semibold text-label-light block mb-0.5 uppercase tracking-wider">Department</span>
                  <div className="text-[11px] font-bold text-foreground uppercase truncate">
                    {pto.employee?.department?.name || '—'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-label-light block mb-0.5 uppercase tracking-wider">Role</span>
                  <div className="text-[11px] font-bold text-foreground uppercase truncate">
                    {pto.employee?.role?.label || '—'}
                  </div>
                </div>
              </div>

              <div className="pb-3 border-b border-separator">
                <span className="text-[10px] font-semibold text-label-light block mb-0.5 uppercase tracking-wider">Email Address</span>
                <div className="text-xs font-bold text-foreground truncate">
                  {pto.employee?.email || '—'}
                </div>
              </div>

              <div className="pb-3 border-b border-separator">
                <span className="text-[10px] font-semibold text-label-light block mb-0.5 uppercase tracking-wider">Phone Number</span>
                <div className="text-sm font-bold text-foreground">
                  {pto.employee?.phoneNumber || '—'}
                </div>
              </div>

            </CardContent>
          </Card>

          {/* History Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-widest uppercase">
                History & Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="space-y-8 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-separator">
                <div className="flex gap-4 relative pl-1">
                  <div className="size-[14px] rounded-full bg-primary ring-4 ring-background z-10 shrink-0" />
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold uppercase tracking-wider">Submitted</div>
                    <div className="text-[10px] text-muted-foreground uppercase">
                      {formatDate(pto.createdAt, { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-4 relative pl-1">
                  <div className={`size-[14px] rounded-full ring-4 ring-background z-10 shrink-0 ${isPending ? 'bg-muted-foreground/20' : 'bg-primary'}`} />
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                      {isPending ? 'Pending' : pto.status}
                    </div>
                    {!isPending && (
                      <div className="text-[10px] text-muted-foreground uppercase">
                        {formatDate(pto.reviewedAt || pto.updatedAt, { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                      </div>
                    )}
                    {pto.reviewNote && (
                      <div className="text-xs mt-3 p-3 bg-muted/40 rounded border border-separator italic text-muted-foreground leading-relaxed">
                        "{pto.reviewNote}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
