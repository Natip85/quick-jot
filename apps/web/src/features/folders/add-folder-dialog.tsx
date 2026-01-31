"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc";

type AddFolderDialogProps = {
  parentId?: string | null;
};

export function AddFolderDialog({ parentId = null }: AddFolderDialogProps) {
  const [open, setOpen] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { mutateAsync: createFolderMutation, isPending } = useMutation(
    trpc.folder.create.mutationOptions({
      onSuccess: () => {
        toast.success("Folder created successfully");
        void queryClient.invalidateQueries({ queryKey: trpc.folder.list.queryKey() });
        setOpen(false);
        form.reset();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create folder");
      },
    })
  );

  const form = useForm({
    defaultValues: {
      name: "",
    },
    onSubmit: async ({ value }) => {
      await createFolderMutation({
        name: value.name,
        parentId,
      });
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(1, "Folder name is required").max(255, "Folder name is too long"),
      }),
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
        >
          <FolderPlus className="size-4" />
          <span className="sr-only">Add folder</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            Enter a name for your new folder. You can organize your notes into folders.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="folder-name">Folder Name</Label>
                <Input
                  id="folder-name"
                  placeholder="My Folder"
                  value={field.state.value}
                  onClear={() => field.handleChange("")}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  autoFocus
                />
                {field.state.meta.errors.map((error) => (
                  <p
                    key={error?.message}
                    className="text-destructive text-sm"
                  >
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="secondary"
                className="min-w-24"
              >
                Cancel
              </Button>
            </DialogClose>
            <form.Subscribe>
              {(state) => (
                <Button
                  type="submit"
                  className="min-w-24"
                  disabled={!state.canSubmit || state.isSubmitting || isPending}
                >
                  {state.isSubmitting || isPending ? "Creating..." : "Ok"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
