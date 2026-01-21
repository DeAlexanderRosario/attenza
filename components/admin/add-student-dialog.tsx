"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { addStudent } from "@/app/actions/admin"
import { getDepartments } from "@/app/actions/department"
import { getClasses } from "@/app/actions/classes"
import { Department, Class } from "@/lib/types"

export function AddStudentDialog() {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [departments, setDepartments] = useState<Department[]>([])
    const [classes, setClasses] = useState<Class[]>([])

    // Consolidated Form State
    const [formData, setFormData] = useState({
        name: "",
        registerNumber: "",
        email: "",
        password: "student123",
        phoneNumber: "",
        gender: "",
        dateOfBirth: "",
        bloodGroup: "",
        rfidTag: "",
        departmentId: "",
        classId: "",
        year: "1",
        fatherName: "",
        motherName: "",
        parentPhone: "",
        parentWhatsApp: "",
        parentEmail: "",
        doorNo: "",
        street: "",
        area: "",
        city: "",
        state: "",
        pincode: ""
    })

    const { toast } = useToast()
    const router = useRouter()

    useEffect(() => {
        if (open) {
            // Load dropdown data
            const loadData = async () => {
                try {
                    const [d, c] = await Promise.all([getDepartments(), getClasses()])
                    setDepartments(d)
                    setClasses(c)
                } catch (e) {
                    console.error("Failed to load options", e)
                }
            }
            loadData()
        }
    }, [open])

    // Filter classes by department if selected
    const filteredClasses = formData.departmentId
        ? classes.filter(c => c.departmentId === formData.departmentId || c.departmentCode === formData.departmentId)
        : classes

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            if (!formData.name || !formData.email || !formData.registerNumber || !formData.departmentId || !formData.classId) {
                toast({ title: "Error", description: "Please fill all required fields (*)", variant: "destructive" })
                setIsLoading(false)
                return
            }

            const result = await addStudent({
                // Basic Info
                name: formData.name,
                email: formData.email,
                registerNumber: formData.registerNumber,
                rfidTag: formData.rfidTag || undefined,

                // Personal Details
                gender: (formData.gender === "Other" ? "other" : formData.gender) as "Male" | "Female" | "other" | undefined,
                dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined,
                bloodGroup: formData.bloodGroup || undefined,
                phoneNumber: formData.phoneNumber || undefined,

                // Academic Info
                departmentId: formData.departmentId,
                classId: formData.classId,
                department: departments.find(d => d.id === formData.departmentId)?.code || "Unknown",
                year: parseInt(formData.year || "1"),

                // Parent Details
                parent: {
                    fatherName: formData.fatherName || undefined,
                    motherName: formData.motherName || undefined,
                    parentPhone: formData.parentPhone || undefined,
                    parentWhatsApp: formData.parentWhatsApp || undefined,
                    parentEmail: formData.parentEmail || undefined,
                },

                // Address
                address: {
                    doorNo: formData.doorNo || undefined,
                    street: formData.street || undefined,
                    area: formData.area || undefined,
                    city: formData.city || undefined,
                    state: formData.state || undefined,
                    pincode: formData.pincode || undefined,
                },

                // Password
                password: formData.password || undefined,
            })

            if (result.success) {
                toast({ title: "Success", description: "Student enrolled successfully" })
                setOpen(false)
                router.refresh()
                // Reset form
                setFormData({
                    name: "",
                    registerNumber: "",
                    email: "",
                    password: "student123",
                    phoneNumber: "",
                    gender: "",
                    dateOfBirth: "",
                    bloodGroup: "",
                    rfidTag: "",
                    departmentId: "",
                    classId: "",
                    year: "1",
                    fatherName: "",
                    motherName: "",
                    parentPhone: "",
                    parentWhatsApp: "",
                    parentEmail: "",
                    doorNo: "",
                    street: "",
                    area: "",
                    city: "",
                    state: "",
                    pincode: ""
                })
            } else {
                toast({ title: "Error", description: result.message || "Failed to add student", variant: "destructive" })
            }
        } catch (error) {
            toast({ title: "Error", description: "Something went wrong", variant: "destructive" })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Enroll Student
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Enroll New Student</DialogTitle>
                        <DialogDescription>
                            Add a new student with complete details.
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
                                <Input id="name" name="name" value={formData.name} onChange={handleInputChange} className="col-span-3" required placeholder="Rahul Kumar" />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="registerNumber" className="text-right">Register No *</Label>
                                <Input id="registerNumber" name="registerNumber" value={formData.registerNumber} onChange={handleInputChange} className="col-span-3" required placeholder="AIK21EE006" />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">Email *</Label>
                                <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} className="col-span-3" required placeholder="rahul@student.college.edu" />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="password" className="text-right">Password</Label>
                                <Input id="password" name="password" type="password" value={formData.password} onChange={handleInputChange} className="col-span-3" placeholder="Default: student123" />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="phoneNumber" className="text-right">Phone</Label>
                                <Input id="phoneNumber" name="phoneNumber" type="tel" value={formData.phoneNumber} onChange={handleInputChange} className="col-span-3" placeholder="9876543210" />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="gender" className="text-right">Gender</Label>
                                <Select value={formData.gender} onValueChange={(val) => handleSelectChange("gender", val)}>
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
                                <Input id="dateOfBirth" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleInputChange} className="col-span-3" />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="bloodGroup" className="text-right">Blood Group</Label>
                                <Select value={formData.bloodGroup} onValueChange={(val) => handleSelectChange("bloodGroup", val)}>
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
                                <Input id="rfidTag" name="rfidTag" value={formData.rfidTag} onChange={handleInputChange} className="col-span-3" placeholder="RFID-8934723" />
                            </div>
                        </TabsContent>

                        {/* ACADEMIC INFO TAB */}
                        <TabsContent value="academic" className="space-y-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="departmentId" className="text-right">Department *</Label>
                                <Select value={formData.departmentId} onValueChange={(val) => handleSelectChange("departmentId", val)} required>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select Department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map(d => (
                                            <SelectItem key={d.id} value={d.id}>{d.name} ({d.code})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="classId" className="text-right">Class/Batch *</Label>
                                <Select value={formData.classId} onValueChange={(val) => handleSelectChange("classId", val)} required>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select Class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredClasses.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="year" className="text-right">Year *</Label>
                                <Input id="year" name="year" type="number" min="1" max="5" value={formData.year} onChange={handleInputChange} className="col-span-3" required />
                            </div>
                        </TabsContent>

                        {/* PARENT DETAILS TAB */}
                        <TabsContent value="parent" className="space-y-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="fatherName" className="text-right">Father's Name</Label>
                                <Input id="fatherName" name="fatherName" value={formData.fatherName} onChange={handleInputChange} className="col-span-3" placeholder="Suresh Kumar" />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="motherName" className="text-right">Mother's Name</Label>
                                <Input id="motherName" name="motherName" value={formData.motherName} onChange={handleInputChange} className="col-span-3" placeholder="Lakshmi Devi" />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="parentPhone" className="text-right">Parent Phone</Label>
                                <Input id="parentPhone" name="parentPhone" type="tel" value={formData.parentPhone} onChange={handleInputChange} className="col-span-3" placeholder="9123456789" />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="parentWhatsApp" className="text-right">Parent WhatsApp</Label>
                                <Input id="parentWhatsApp" name="parentWhatsApp" type="tel" value={formData.parentWhatsApp} onChange={handleInputChange} className="col-span-3" placeholder="9876543210" />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="parentEmail" className="text-right">Parent Email</Label>
                                <Input id="parentEmail" name="parentEmail" type="email" value={formData.parentEmail} onChange={handleInputChange} className="col-span-3" placeholder="suresh@gmail.com" />
                            </div>
                        </TabsContent>

                        {/* ADDRESS TAB */}
                        <TabsContent value="address" className="space-y-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="doorNo" className="text-right">Door No</Label>
                                <Input id="doorNo" name="doorNo" value={formData.doorNo} onChange={handleInputChange} className="col-span-3" placeholder="12/4" />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="street" className="text-right">Street</Label>
                                <Input id="street" name="street" value={formData.street} onChange={handleInputChange} className="col-span-3" placeholder="MG Street" />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="area" className="text-right">Area</Label>
                                <Input id="area" name="area" value={formData.area} onChange={handleInputChange} className="col-span-3" placeholder="Tambaram" />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="city" className="text-right">City</Label>
                                <Input id="city" name="city" value={formData.city} onChange={handleInputChange} className="col-span-3" placeholder="Chennai" />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="state" className="text-right">State</Label>
                                <Input id="state" name="state" value={formData.state} onChange={handleInputChange} className="col-span-3" placeholder="Tamil Nadu" />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="pincode" className="text-right">Pincode</Label>
                                <Input id="pincode" name="pincode" value={formData.pincode} onChange={handleInputChange} className="col-span-3" placeholder="600045" />
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Enrolling..." : "Enroll Student"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
