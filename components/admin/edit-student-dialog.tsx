"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Edit } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { updateStudent } from "@/app/actions/admin"

interface EditStudentDialogProps {
    student: any
    departments?: any[]
    classes?: any[]
}

export function EditStudentDialog({ student, departments = [], classes = [] }: EditStudentDialogProps) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [selectedGender, setSelectedGender] = useState(student.gender || "")
    const [selectedBloodGroup, setSelectedBloodGroup] = useState(student.bloodGroup || "")

    const { toast } = useToast()
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)
        const formData = new FormData(e.currentTarget)

        try {
            const result = await updateStudent(student.id, {
                // Basic Info
                name: formData.get("name") as string,
                email: formData.get("email") as string,
                registerNumber: formData.get("registerNumber") as string,
                rfidTag: formData.get("rfidTag") as string || undefined,

                // Personal Details
                gender: selectedGender as any || undefined,
                dateOfBirth: formData.get("dateOfBirth") ? new Date(formData.get("dateOfBirth") as string) : undefined,
                bloodGroup: selectedBloodGroup || undefined,
                phoneNumber: formData.get("phoneNumber") as string || undefined,

                // Parent Details
                parent: {
                    fatherName: formData.get("fatherName") as string || undefined,
                    motherName: formData.get("motherName") as string || undefined,
                    parentPhone: formData.get("parentPhone") as string || undefined,
                    parentWhatsApp: formData.get("parentWhatsApp") as string || undefined,
                    parentEmail: formData.get("parentEmail") as string || undefined,
                },

                // Address
                address: {
                    doorNo: formData.get("doorNo") as string || undefined,
                    street: formData.get("street") as string || undefined,
                    area: formData.get("area") as string || undefined,
                    city: formData.get("city") as string || undefined,
                    state: formData.get("state") as string || undefined,
                    pincode: formData.get("pincode") as string || undefined,
                }
            })

            if (result.success) {
                toast({ title: "Success", description: "Student updated successfully" })
                setOpen(false)
                router.refresh()
            } else {
                toast({ title: "Error", description: result.message || "Failed to update student", variant: "destructive" })
            }
        } catch (error) {
            toast({ title: "Error", description: "Something went wrong", variant: "destructive" })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <Button variant="outline" onClick={() => setOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Profile
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>Edit Student Profile</DialogTitle>
                            <DialogDescription>
                                Update student information and details.
                            </DialogDescription>
                        </DialogHeader>

                        <Tabs defaultValue="basic" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="basic">Basic</TabsTrigger>
                                <TabsTrigger value="academic">Academic</TabsTrigger>
                                <TabsTrigger value="parent">Parent</TabsTrigger>
                                <TabsTrigger value="address">Address</TabsTrigger>
                            </TabsList>

                            {/* BASIC INFO TAB */}
                            <TabsContent value="basic" className="space-y-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">Name *</Label>
                                    <Input id="name" name="name" className="col-span-3" required defaultValue={student.name} />
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="registerNumber" className="text-right">Register No *</Label>
                                    <Input id="registerNumber" name="registerNumber" className="col-span-3" required defaultValue={student.registerNumber} />
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="email" className="text-right">Email *</Label>
                                    <Input id="email" name="email" type="email" className="col-span-3" required defaultValue={student.email} />
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="phoneNumber" className="text-right">Phone</Label>
                                    <Input id="phoneNumber" name="phoneNumber" type="tel" className="col-span-3" defaultValue={student.phoneNumber} />
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="gender" className="text-right">Gender</Label>
                                    <Select value={selectedGender} onValueChange={setSelectedGender}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select Gender" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Male">Male</SelectItem>
                                            <SelectItem value="Female">Female</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="dateOfBirth" className="text-right">Date of Birth</Label>
                                    <Input
                                        id="dateOfBirth"
                                        name="dateOfBirth"
                                        type="date"
                                        className="col-span-3"
                                        defaultValue={student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : ''}
                                    />
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="bloodGroup" className="text-right">Blood Group</Label>
                                    <Select value={selectedBloodGroup} onValueChange={setSelectedBloodGroup}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Select Blood Group" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="A+">A+</SelectItem>
                                            <SelectItem value="A-">A-</SelectItem>
                                            <SelectItem value="B+">B+</SelectItem>
                                            <SelectItem value="B-">B-</SelectItem>
                                            <SelectItem value="O+">O+</SelectItem>
                                            <SelectItem value="O-">O-</SelectItem>
                                            <SelectItem value="AB+">AB+</SelectItem>
                                            <SelectItem value="AB-">AB-</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="rfidTag" className="text-right">RFID Tag</Label>
                                    <Input id="rfidTag" name="rfidTag" className="col-span-3" defaultValue={student.rfidTag} />
                                </div>
                            </TabsContent>

                            {/* ACADEMIC INFO TAB */}
                            <TabsContent value="academic" className="space-y-4 py-4">
                                <div className="p-4 bg-muted rounded-lg">
                                    <p className="text-sm text-muted-foreground">
                                        <strong>Note:</strong> Department and Class changes should be done through the enrollment management system.
                                    </p>
                                    <div className="mt-4 space-y-2">
                                        <p><strong>Department:</strong> {student.departmentName} ({student.departmentCode})</p>
                                        <p><strong>Class:</strong> {student.className}</p>
                                        <p><strong>Year:</strong> {student.year}</p>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* PARENT DETAILS TAB */}
                            <TabsContent value="parent" className="space-y-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="fatherName" className="text-right">Father's Name</Label>
                                    <Input id="fatherName" name="fatherName" className="col-span-3" defaultValue={student.parent?.fatherName} />
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="motherName" className="text-right">Mother's Name</Label>
                                    <Input id="motherName" name="motherName" className="col-span-3" defaultValue={student.parent?.motherName} />
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="parentPhone" className="text-right">Parent Phone</Label>
                                    <Input id="parentPhone" name="parentPhone" type="tel" className="col-span-3" defaultValue={student.parent?.parentPhone} />
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="parentWhatsApp" className="text-right">Parent WhatsApp</Label>
                                    <Input id="parentWhatsApp" name="parentWhatsApp" type="tel" className="col-span-3" defaultValue={student.parent?.parentWhatsApp} />
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="parentEmail" className="text-right">Parent Email</Label>
                                    <Input id="parentEmail" name="parentEmail" type="email" className="col-span-3" defaultValue={student.parent?.parentEmail} />
                                </div>
                            </TabsContent>

                            {/* ADDRESS TAB */}
                            <TabsContent value="address" className="space-y-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="doorNo" className="text-right">Door No</Label>
                                    <Input id="doorNo" name="doorNo" className="col-span-3" defaultValue={student.address?.doorNo} />
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="street" className="text-right">Street</Label>
                                    <Input id="street" name="street" className="col-span-3" defaultValue={student.address?.street} />
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="area" className="text-right">Area</Label>
                                    <Input id="area" name="area" className="col-span-3" defaultValue={student.address?.area} />
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="city" className="text-right">City</Label>
                                    <Input id="city" name="city" className="col-span-3" defaultValue={student.address?.city} />
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="state" className="text-right">State</Label>
                                    <Input id="state" name="state" className="col-span-3" defaultValue={student.address?.state} />
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="pincode" className="text-right">Pincode</Label>
                                    <Input id="pincode" name="pincode" className="col-span-3" defaultValue={student.address?.pincode} />
                                </div>
                            </TabsContent>
                        </Tabs>

                        <DialogFooter className="mt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Saving..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
