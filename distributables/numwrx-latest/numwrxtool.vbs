Option Explicit

Dim varLetter

WScript.Echo ""
WScript.Echo "© 2026 Josh de man - Weegschaalmethode speedrunner"
WScript.Echo "Voorbeelden:  4x-12=12x+6  |  3x-(x-1)=10+5*(x-1)  |  -5y+7=2y-14"
WScript.Echo ""

If WScript.Arguments.Count > 0 Then
    Solve WScript.Arguments(0)
Else
    Dim invoer
    Do
        invoer = InputOrPrompt("Vergelijking (of stop): ")
        If LCase(Trim(invoer)) = "stop" Or invoer = "" Then Exit Do
        Solve invoer
    Loop
End If

WScript.Echo ""
WScript.Echo "Programma beeindigd."

Function InputOrPrompt(prompt)
    WScript.StdOut.Write prompt
    InputOrPrompt = WScript.StdIn.ReadLine()
End Function

Sub Solve(rawInput)
    Dim vgl : vgl = Replace(rawInput, " ", "")

    If InStr(vgl, "=") = 0 Then
        WScript.Echo "Geen '=' gevonden."
        WScript.Echo ""
        Exit Sub
    End If

    Dim eqPos : eqPos = InStr(vgl, "=")
    Dim lhs : lhs = Left(vgl, eqPos - 1)
    Dim rhs : rhs = Mid(vgl, eqPos + 1)

    Dim candidates : candidates = Array("x","y","z","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w")
    varLetter = ""
    Dim i
    For i = 0 To UBound(candidates)
        If InStr(LCase(vgl), candidates(i)) > 0 Then
            varLetter = candidates(i)
            Exit For
        End If
    Next
    If varLetter = "" Then
        WScript.Echo "Geen variabele gevonden."
        WScript.Echo ""
        Exit Sub
    End If

    Dim firstLine : firstLine = lhs & "=" & rhs
    Dim arrowCol  : arrowCol  = Len(firstLine) + 2

    WScript.Echo ""

    Dim eqs(20), ops(20)
    Dim stepCount : stepCount = 0

    Dim hadBrackets : hadBrackets = (InStr(lhs,"(") > 0 Or InStr(rhs,"(") > 0)
    If hadBrackets Then
        lhs = ExpandAll(lhs)
        rhs = ExpandAll(rhs)
        eqs(stepCount) = lhs & "=" & rhs
        ops(stepCount) = "haakjes wegwerken"
        stepCount = stepCount + 1
    End If

    Dim lvc, lct, rvc, rct
    ParseExpr lhs, lvc, lct
    ParseExpr rhs, rvc, rct

    Dim hls : hls = ExprStr(lvc, lct)
    Dim hrs : hrs = ExprStr(rvc, rct)
    If hls <> lhs Or hrs <> rhs Then
        eqs(stepCount) = hls & "=" & hrs
        ops(stepCount) = "herleiden"
        stepCount = stepCount + 1
    End If
    lhs = hls : rhs = hrs

    If rvc <> 0 Then
        Dim op1
        If rvc > 0 Then
            op1 = "-" & CStr(rvc) & varLetter
        Else
            op1 = "+" & CStr(Abs(rvc)) & varLetter
        End If
        lvc = lvc - rvc
        rvc = 0
        hls = ExprStr(lvc, lct)
        hrs = ExprStr(rvc, rct)
        eqs(stepCount) = hls & "=" & hrs
        ops(stepCount) = op1
        stepCount = stepCount + 1
        lhs = hls : rhs = hrs
    End If

    If lct <> 0 Then
        Dim op2
        If lct > 0 Then
            op2 = "-" & CStr(lct)
        Else
            op2 = "+" & CStr(Abs(lct))
        End If
        rct = rct - lct
        lct = 0
        hls = ExprStr(lvc, lct)
        hrs = ExprStr(rvc, rct)
        eqs(stepCount) = hls & "=" & hrs
        ops(stepCount) = op2
        stepCount = stepCount + 1
        lhs = hls : rhs = hrs
    End If

    If lvc = 0 Then
        PrintSteps eqs, ops, stepCount, arrowCol
        WScript.Echo ""
        If rct = 0 Then
            WScript.Echo "Oneindig veel oplossingen."
        Else
            WScript.Echo "Geen oplossing."
        End If
        WScript.Echo ""
        Exit Sub
    End If

    Dim op3, ans
    If lvc <> 1 Then
        op3 = ": " & CStr(lvc)
        ans = FracStr(rct, lvc)
        eqs(stepCount) = varLetter & "=" & ans
        ops(stepCount) = op3
        stepCount = stepCount + 1
    Else
        eqs(stepCount) = varLetter & "=" & CStr(rct)
        ops(stepCount) = ""
        stepCount = stepCount + 1
    End If

    Dim spaces80 : spaces80 = Space(80)
    If stepCount > 0 And ops(0) <> "" Then
        Dim fp : fp = arrowCol - Len(firstLine)
        If fp < 1 Then fp = 1
        WScript.Echo firstLine & Left(spaces80, fp) & "v " & ops(0)
    Else
        WScript.Echo firstLine
    End If

    PrintSteps eqs, ops, stepCount, arrowCol
    WScript.Echo ""
End Sub

Sub PrintSteps(eqs, ops, count, arrowCol)
    Dim i, eq, op, spaces
    spaces = Space(80)
    For i = 0 To count - 1
        eq = eqs(i)
        If i < count - 1 Then
            op = ops(i + 1)
        Else
            op = ""
        End If
        If op = "" Then
            WScript.Echo eq
        Else
            Dim padLen : padLen = arrowCol - Len(eq)
            If padLen < 1 Then padLen = 1
            WScript.Echo eq & Left(spaces, padLen) & "v " & op
        End If
    Next
End Sub

Function AddImplicitMult(s)
    Dim i, result, c, nc
    result = ""
    For i = 1 To Len(s)
        c  = Mid(s, i, 1)
        nc = Mid(s, i+1, 1)
        result = result & c
        If nc = "(" And (IsNumeric(c) Or c = ")") Then
            result = result & "*"
        End If
    Next
    AddImplicitMult = result
End Function

Function ExpandAll(s)
    Dim expr : expr = AddImplicitMult(s)
    Dim prev
    Do
        prev = expr
        expr = ExpandOne(expr)
    Loop While expr <> prev
    ExpandAll = expr
End Function

Function ExpandOne(s)
    Dim openPos : openPos = InStr(s, "(")
    If openPos = 0 Then ExpandOne = s : Exit Function

    Dim closePos : closePos = InStr(openPos, s, ")")
    If closePos = 0 Then ExpandOne = s : Exit Function

    Dim inner : inner = Mid(s, openPos + 1, closePos - openPos - 1)

    Dim factor : factor = 1
    Dim prefixEnd : prefixEnd = openPos - 1

    Dim j : j = openPos - 1

    If j >= 1 And Mid(s, j, 1) = "*" Then j = j - 1

    Dim digitStr : digitStr = ""
    Do While j >= 1 And IsNumeric(Mid(s, j, 1)) And Mid(s,j,1) <> "."
        digitStr = Mid(s, j, 1) & digitStr
        j = j - 1
    Loop

    Dim signChar : signChar = ""
    If j >= 1 Then signChar = Mid(s, j, 1)

    Dim mag : mag = 1
    If digitStr <> "" Then mag = CLng(digitStr)

    If signChar = "-" Then
        factor = -mag
        prefixEnd = j - 1
    ElseIf signChar = "+" Then
        factor = mag
        prefixEnd = j - 1
    Else
        factor = mag
        prefixEnd = j
    End If

    Dim prefix : prefix = Left(s, prefixEnd)
    Dim suffix : suffix = Mid(s, closePos + 1)

    Dim distributed : distributed = Distribute(inner, factor)

    Dim result
    If prefix = "" Then
        result = distributed & suffix
    Else
        Dim d1 : d1 = Left(distributed, 1)
        If d1 = "-" Then
            result = prefix & distributed & suffix
        Else
            result = prefix & "+" & distributed & suffix
        End If
    End If

    ExpandOne = result
End Function

Function Distribute(expr, factor)
    Dim terms : terms = ParseTerms(expr)
    Dim i, result, part, c1
    result = ""
    For i = 0 To UBound(terms, 2)
        Dim coef    : coef    = terms(0, i) * factor
        Dim hasVar  : hasVar  = terms(1, i)

        If hasVar = 1 Then
            Select Case coef
                Case 1  : part = varLetter
                Case -1 : part = "-" & varLetter
                Case Else: part = CStr(coef) & varLetter
            End Select
        Else
            part = CStr(coef)
        End If

        If result = "" Then
            result = part
        ElseIf Left(part, 1) = "-" Then
            result = result & part
        Else
            result = result & "+" & part
        End If
    Next
    If result = "" Then result = "0"
    Distribute = result
End Function

Function ParseTerms(s)
    Dim expr : expr = s
    If Left(expr,1) <> "+" And Left(expr,1) <> "-" Then expr = "+" & expr

    Dim n : n = Len(expr)
    Dim i, c
    Dim sign    : sign    = 1
    Dim numStr  : numStr  = ""
    Dim hasVar  : hasVar  = 0
    Dim terms() : ReDim terms(1, 0)
    Dim tc      : tc      = 0

    Dim inTerm  : inTerm  = False

    i = 1
    Do While i <= n
        c = Mid(expr, i, 1)

        If c = "+" Or c = "-" Then
            If inTerm Then
                Dim mag2 : mag2 = 1
                If numStr <> "" Then mag2 = CLng(numStr)
                ReDim Preserve terms(1, tc)
                terms(0, tc) = sign * mag2
                terms(1, tc) = hasVar
                tc = tc + 1
            End If
            If c = "+" Then sign = 1 Else sign = -1
            numStr = "" : hasVar = 0 : inTerm = True

        ElseIf LCase(c) = varLetter Then
            hasVar = 1 : inTerm = True

        ElseIf c >= "0" And c <= "9" Then
            numStr = numStr & c : inTerm = True
        End If

        i = i + 1
    Loop

    If inTerm Then
        Dim mag3 : mag3 = 1
        If numStr <> "" Then mag3 = CLng(numStr)
        ReDim Preserve terms(1, tc)
        terms(0, tc) = sign * mag3
        terms(1, tc) = hasVar
        tc = tc + 1
    End If

    ParseTerms = terms
End Function

Sub ParseExpr(s, ByRef vc, ByRef ct)
    Dim terms : terms = ParseTerms(s)
    vc = 0 : ct = 0
    Dim i
    For i = 0 To UBound(terms, 2)
        If terms(1, i) = 1 Then
            vc = vc + terms(0, i)
        Else
            ct = ct + terms(0, i)
        End If
    Next
End Sub

Function ExprStr(vc, ct)
    Dim s : s = ""
    If vc <> 0 Then
        Select Case vc
            Case 1  : s = varLetter
            Case -1 : s = "-" & varLetter
            Case Else: s = CStr(vc) & varLetter
        End Select
    End If
    If ct <> 0 Then
        If s = "" Then
            s = CStr(ct)
        ElseIf ct > 0 Then
            s = s & "+" & CStr(ct)
        Else
            s = s & CStr(ct)
        End If
    End If
    If s = "" Then s = "0"
    ExprStr = s
End Function

Function FracStr(num, den)
    Dim g : g = GCD(Abs(num), Abs(den))
    Dim n : n = num \ g
    Dim d : d = den \ g
    If d < 0 Then n = -n : d = -d
    If d = 1 Then
        FracStr = CStr(n)
    Else
        Dim whole : whole = n \ d
        Dim remainder : remainder = Abs(n Mod d)
        If remainder = 0 Then
            FracStr = CStr(whole)
        ElseIf whole = 0 Then
            FracStr = CStr(n) & "/" & CStr(d)
        Else
            FracStr = CStr(whole) & " " & CStr(remainder) & "/" & CStr(d)
        End If
    End If
End Function

Function GCD(a, b)
    Do While b <> 0
        Dim t : t = b
        b = a Mod b
        a = t
    Loop
    If a = 0 Then a = 1
    GCD = a
End Function
