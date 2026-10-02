export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      decisions: {
        Row: {
          decided_at: string
          decided_by: string
          decision: string
          from_status: Database["public"]["Enums"]["gate_status"] | null
          gate_id: number | null
          id: number
          kind: Database["public"]["Enums"]["decision_kind"]
          launch_id: number
          rationale: string
          risk_id: number | null
          to_status: Database["public"]["Enums"]["gate_status"] | null
          waiver_rationale: string | null
        }
        Insert: {
          decided_at?: string
          decided_by: string
          decision: string
          from_status?: Database["public"]["Enums"]["gate_status"] | null
          gate_id?: number | null
          id?: never
          kind: Database["public"]["Enums"]["decision_kind"]
          launch_id: number
          rationale: string
          risk_id?: number | null
          to_status?: Database["public"]["Enums"]["gate_status"] | null
          waiver_rationale?: string | null
        }
        Update: {
          decided_at?: string
          decided_by?: string
          decision?: string
          from_status?: Database["public"]["Enums"]["gate_status"] | null
          gate_id?: number | null
          id?: never
          kind?: Database["public"]["Enums"]["decision_kind"]
          launch_id?: number
          rationale?: string
          risk_id?: number | null
          to_status?: Database["public"]["Enums"]["gate_status"] | null
          waiver_rationale?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decisions_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_launch_id_fkey"
            columns: ["launch_id"]
            isOneToOne: false
            referencedRelation: "launches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          created_at: string
          gate_id: number
          id: number
          recorded_on: string | null
          source: string | null
          summary: string
          title: string
          type: Database["public"]["Enums"]["evidence_type"]
        }
        Insert: {
          created_at?: string
          gate_id: number
          id?: never
          recorded_on?: string | null
          source?: string | null
          summary: string
          title: string
          type: Database["public"]["Enums"]["evidence_type"]
        }
        Update: {
          created_at?: string
          gate_id?: number
          id?: never
          recorded_on?: string | null
          source?: string | null
          summary?: string
          title?: string
          type?: Database["public"]["Enums"]["evidence_type"]
        }
        Relationships: [
          {
            foreignKeyName: "evidence_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
        ]
      }
      gates: {
        Row: {
          category: Database["public"]["Enums"]["gate_category"]
          created_at: string
          id: number
          launch_id: number
          owner: string
          pass_criteria: string
          required: boolean
          status: Database["public"]["Enums"]["gate_status"]
          title: string
          updated_at: string
          waiver_rationale: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["gate_category"]
          created_at?: string
          id?: never
          launch_id: number
          owner: string
          pass_criteria: string
          required?: boolean
          status?: Database["public"]["Enums"]["gate_status"]
          title: string
          updated_at?: string
          waiver_rationale?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["gate_category"]
          created_at?: string
          id?: never
          launch_id?: number
          owner?: string
          pass_criteria?: string
          required?: boolean
          status?: Database["public"]["Enums"]["gate_status"]
          title?: string
          updated_at?: string
          waiver_rationale?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gates_launch_id_fkey"
            columns: ["launch_id"]
            isOneToOne: false
            referencedRelation: "launches"
            referencedColumns: ["id"]
          },
        ]
      }
      launches: {
        Row: {
          created_at: string
          description: string
          id: number
          name: string
          owner: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: never
          name: string
          owner: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: never
          name?: string
          owner?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      risks: {
        Row: {
          created_at: string
          description: string
          gate_id: number | null
          id: number
          impact: Database["public"]["Enums"]["level"]
          launch_id: number
          likelihood: Database["public"]["Enums"]["level"]
          mitigation: string
          owner: string
          status: Database["public"]["Enums"]["risk_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          gate_id?: number | null
          id?: never
          impact: Database["public"]["Enums"]["level"]
          launch_id: number
          likelihood: Database["public"]["Enums"]["level"]
          mitigation: string
          owner: string
          status?: Database["public"]["Enums"]["risk_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          gate_id?: number | null
          id?: never
          impact?: Database["public"]["Enums"]["level"]
          launch_id?: number
          likelihood?: Database["public"]["Enums"]["level"]
          mitigation?: string
          owner?: string
          status?: Database["public"]["Enums"]["risk_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_launch_id_fkey"
            columns: ["launch_id"]
            isOneToOne: false
            referencedRelation: "launches"
            referencedColumns: ["id"]
          },
        ]
      }
      rollout_stages: {
        Row: {
          entry_criteria: string
          exit_criteria: string
          id: number
          launch_id: number
          stage: Database["public"]["Enums"]["stage_kind"]
          status: Database["public"]["Enums"]["stage_status"]
        }
        Insert: {
          entry_criteria: string
          exit_criteria: string
          id?: never
          launch_id: number
          stage: Database["public"]["Enums"]["stage_kind"]
          status?: Database["public"]["Enums"]["stage_status"]
        }
        Update: {
          entry_criteria?: string
          exit_criteria?: string
          id?: never
          launch_id?: number
          stage?: Database["public"]["Enums"]["stage_kind"]
          status?: Database["public"]["Enums"]["stage_status"]
        }
        Relationships: [
          {
            foreignKeyName: "rollout_stages_launch_id_fkey"
            columns: ["launch_id"]
            isOneToOne: false
            referencedRelation: "launches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      launch_current_stage: {
        Row: {
          launch_id: number | null
          stage: Database["public"]["Enums"]["stage_kind"] | null
          status: Database["public"]["Enums"]["stage_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "rollout_stages_launch_id_fkey"
            columns: ["launch_id"]
            isOneToOne: false
            referencedRelation: "launches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      reset_demo_data: { Args: never; Returns: undefined }
      set_gate_status: {
        Args: {
          decided_by: string
          gate_id: number
          new_status: Database["public"]["Enums"]["gate_status"]
          rationale: string
          waiver_rationale?: string
        }
        Returns: number
      }
    }
    Enums: {
      decision_kind: "status_change" | "manual"
      evidence_type:
        | "Evaluation result"
        | "Test"
        | "Document"
        | "Sign-off"
        | "Observation"
      gate_category:
        | "Evaluation"
        | "Safety & Escalation"
        | "Human-in-the-Loop"
        | "Data & Privacy"
        | "Reliability & Operations"
        | "Monitoring"
        | "Rollback"
        | "Enablement & Training"
        | "Stakeholder Sign-off"
      gate_status:
        | "Not started"
        | "In progress"
        | "Passed"
        | "Failed"
        | "Waived"
      level: "Low" | "Medium" | "High"
      risk_status: "Open" | "Mitigating" | "Accepted" | "Closed"
      stage_kind: "Shadow" | "Assist" | "Partial automation"
      stage_status: "Not started" | "Active" | "Completed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      decision_kind: ["status_change", "manual"],
      evidence_type: [
        "Evaluation result",
        "Test",
        "Document",
        "Sign-off",
        "Observation",
      ],
      gate_category: [
        "Evaluation",
        "Safety & Escalation",
        "Human-in-the-Loop",
        "Data & Privacy",
        "Reliability & Operations",
        "Monitoring",
        "Rollback",
        "Enablement & Training",
        "Stakeholder Sign-off",
      ],
      gate_status: ["Not started", "In progress", "Passed", "Failed", "Waived"],
      level: ["Low", "Medium", "High"],
      risk_status: ["Open", "Mitigating", "Accepted", "Closed"],
      stage_kind: ["Shadow", "Assist", "Partial automation"],
      stage_status: ["Not started", "Active", "Completed"],
    },
  },
} as const
